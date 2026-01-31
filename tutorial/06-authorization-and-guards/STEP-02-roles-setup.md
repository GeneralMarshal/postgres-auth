# Step 02: Roles Setup

**Goal**: Add roles to User model and update database schema

## Prerequisites

- ✅ Completed Step 01
- ✅ Understanding of authentication vs authorization
- ✅ Prisma schema knowledge

## What Are Roles?

**Roles** are labels that define what a user can do in your application. Common roles include:

- **`user`** - Regular user (default)
- **`admin`** - Administrator with full access
- **`moderator`** - Can moderate content
- **`manager`** - Can manage team resources

**Why Roles?**

- ✅ Simple to understand and implement
- ✅ Easy to check permissions
- ✅ Flexible for most applications
- ✅ Industry standard (RBAC)

## Step 1: Update Prisma Schema

Open `prisma/schema.prisma` and add a `role` field to the User model:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("user")  // ← Add this line
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Breaking it down:**

- `role String` - Role stored as string
- `@default("user")` - Default role is "user"
- No `@unique` - Multiple users can have the same role

## Step 2: Create Role Enum (Optional but Recommended)

For better type safety, create an enum. Update `prisma/schema.prisma`:

```prisma
enum UserRole {
  USER
  ADMIN
  MODERATOR
  MANAGER
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      UserRole @default(USER)  // ← Use enum instead
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Benefits of enum:**

- ✅ Type safety in TypeScript
- ✅ Prevents typos (can't use "admn" instead of "admin")
- ✅ IDE autocomplete
- ✅ Clear documentation of available roles

**For this tutorial, we'll use String for simplicity, but enum is recommended for production.**

## Step 3: Generate Prisma Client

After updating the schema, generate the Prisma client:

```bash
npx prisma generate
```

**What this does:**

- ✅ Updates TypeScript types
- ✅ `User` type now includes `role: string`
- ✅ Prisma client methods updated

## Step 4: Push Schema to Database

Apply the schema changes to your database:

```bash
npx prisma db push
```

**What this does:**

- ✅ Adds `role` column to `User` table
- ✅ Sets default value to "user" for existing users
- ✅ Updates database schema

**Alternative (if using migrations):**

```bash
npx prisma migrate dev --name add_user_role
```

## Step 5: Verify Database Changes

Check that the column was added:

```bash
npx prisma studio
```

Or use `psql`:

```sql
\d "User"
```

You should see the `role` column with default value `"user"`.

## Step 6: Update User DTOs

Update `src/user/dto/create-user.dto.ts` to include optional role:

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['user', 'admin', 'moderator', 'manager'], {
    message: 'Role must be one of: user, admin, moderator, manager',
  })
  role?: string;
}
```

**Breaking it down:**

- `@IsOptional()` - Role is optional (defaults to "user")
- `@IsIn([...])` - Only allows specific role values
- Prevents invalid roles like "superadmin" or "hacker"

**Update `src/user/dto/update-user.dto.ts`:**

```typescript
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['user', 'admin', 'moderator', 'manager'], {
    message: 'Role must be one of: user, admin, moderator, manager',
  })
  role?: string;
}
```

## Step 7: Update User Service (Optional)

If you want to ensure role defaults to "user" when creating users, update `src/user/users.service.ts`:

```typescript
async create(createUserDto: CreateUserDto) {
  const existingUser = await this.findByEmail(createUserDto.email);

  if (existingUser) {
    throw new ConflictException('User with this email already exists');
  }

  const hashedPassword = await this.passwordService.hashPassword(
    createUserDto.password,
  );

  const user = await this.prisma.user.create({
    data: {
      email: createUserDto.email,
      password: hashedPassword,
      name: createUserDto.name,
      role: createUserDto.role || 'user',  // ← Default to 'user'
    },
  });

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
```

**Note:** Prisma will use the default value from the schema, but being explicit is clearer.

## Step 8: Update JWT Payload (Optional)

If you want to include role in JWT token, update `src/auth/services/jwt/jwt.service.ts`:

```typescript
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role?: string; // ← Add role
  jti: string; // Token ID
  iat: number; // Issued at
  exp: number; // Expiration
}
```

**Update `generateToken` method:**

```typescript
async generateToken(
  userId: string,
  email: string,
  role?: string,  // ← Add role parameter
): Promise<{ token: string; tokenId: string }> {
  const tokenId = this.getTokenId();
  const payload: JwtPayload = {
    sub: userId,
    email,
    role,  // ← Include role in payload
    jti: tokenId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + this.expiresIn,
  };

  const token = this.jwtService.sign(payload);
  return { token, tokenId };
}
```

**Update `UsersService.login` to pass role:**

```typescript
async login(loginUserDto: LoginUserDto) {
  const user = await this.findByEmail(loginUserDto.email);

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isPasswordValid = await this.passwordService.comparePassword(
    loginUserDto.password,
    user.password,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const { token, tokenId } = await this.jwtService.generateToken(
    user.id,
    user.email,
    user.role,  // ← Pass role
  );

  await this.sessionService.createSession(tokenId, {
    userId: user.id,
    email: user.email,
    role: user.role,  // ← Include role in session
    createdAt: new Date().toISOString(),
  });

  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    accessToken: token,
  };
}
```

**Benefits of including role in JWT:**

- ✅ No database lookup needed to check role
- ✅ Faster authorization checks
- ✅ Role available in token payload

**Trade-offs:**

- ❌ Role changes require re-login (or token refresh)
- ❌ Token size slightly larger

## Step 9: Create a Helper Function (Optional)

Create `src/common/constants/roles.ts`:

```typescript
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MANAGER = 'manager',
}

export const ROLES_KEY = 'roles';
```

**Usage:**

```typescript
import { UserRole } from 'src/common/constants/roles';

if (user.role === UserRole.ADMIN) {
  // Admin logic
}
```

## Step 10: Test the Changes

**1. Create a user with default role:**

```bash
POST /users/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Regular User"
}
```

**Expected:** User created with `role: "user"`

**2. Create an admin user:**

```bash
POST /users/register
{
  "email": "admin@example.com",
  "password": "password123",
  "name": "Admin User",
  "role": "admin"
}
```

**Expected:** User created with `role: "admin"`

**3. Update user role:**

```bash
PATCH /users/:id
Authorization: Bearer <token>
{
  "role": "moderator"
}
```

**Expected:** User role updated to "moderator"

## Common Issues

**Issue 1: "Column 'role' does not exist"**

**Solution:** Run `npx prisma db push` to apply schema changes.

**Issue 2: "Invalid role value"**

**Solution:** Check DTO validation - ensure `@IsIn()` includes the role you're using.

**Issue 3: "Type error: Property 'role' does not exist"**

**Solution:** Run `npx prisma generate` to update TypeScript types.

## Summary

**What we did:**

1. ✅ Added `role` field to User model
2. ✅ Set default role to "user"
3. ✅ Updated Prisma schema and database
4. ✅ Updated DTOs with role validation
5. ✅ (Optional) Included role in JWT payload

**Current state:**

- ✅ Users have roles
- ✅ Roles stored in database
- ✅ Roles validated in DTOs
- ✅ Roles can be included in JWT tokens

**Next step:**
Now that users have roles, let's create guards that check these roles!

---

**Ready?** Move to [STEP-03-role-guards.md](./STEP-03-role-guards.md)!
