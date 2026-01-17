# STEP 04: Build Login Endpoint

**Goal**: Create user login with password verification

## What We're Building

A complete login endpoint that:

1. Validates user input (email, password)
2. Finds user by email
3. Verifies password using bcrypt
4. Returns success/error response

## Step-by-Step Implementation

### Step 1: Create Login DTO

Create `src/users/dto/login-user.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
```

**Why separate DTO from CreateUserDto?**

- **Different validation**: Login doesn't need name, doesn't need min length
- **Clear intent**: Login vs Registration are different operations
- **Flexibility**: Can change login requirements without affecting registration

### Step 2: Add Login Method to Service

Update `src/users/users.service.ts`:

```typescript
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { PasswordService } from '../common/services/password.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  // ... existing methods ...

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async login(loginUserDto: LoginUserDto): Promise<Omit<User, 'password'>> {
    // Find user by email
    const user = await this.findByEmail(loginUserDto.email);

    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePassword(
      loginUserDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
```

**Let's break down the login method**:

#### Find User by Email

```typescript
const user = await this.findByEmail(loginUserDto.email);

if (!user) {
  throw new NotFoundException('Invalid email or password');
}
```

**Why generic error message?**

- **Security**: Don't reveal if email exists
- Attacker can't enumerate valid emails
- Same message for wrong email or wrong password

#### Check if User is Active

```typescript
if (!user.isActive) {
  throw new UnauthorizedException('Account is inactive');
}
```

**Why check?**

- Prevents login for deactivated accounts
- Security feature (can disable accounts)
- Clear error message for legitimate users

#### Verify Password

```typescript
const isPasswordValid = await this.passwordService.comparePassword(
  loginUserDto.password, // Plaintext from user
  user.password, // Hashed from database
);

if (!isPasswordValid) {
  throw new UnauthorizedException('Invalid email or password');
}
```

**How it works**:

1. `comparePassword()` extracts salt from stored hash
2. Hashes entered password with extracted salt
3. Compares the two hashes
4. Returns `true` if match, `false` otherwise

**Why async?**

- bcrypt comparison is CPU-intensive
- Async prevents blocking event loop

#### Return User Without Password

```typescript
const { password, ...userWithoutPassword } = user;
return userWithoutPassword;
```

- Same security practice as registration
- Never return password (even hashed)

### Step 3: Add Login Endpoint to Controller

Update `src/users/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }
}
```

**What's new**:

#### @Post('login')

```typescript
@Post('login')
async login(@Body() loginUserDto: LoginUserDto) {
```

- Route: `POST /users/login`
- Validates input with `LoginUserDto`
- Returns user data on success

#### @HttpCode(HttpStatus.OK)

```typescript
@HttpCode(HttpStatus.OK)
```

- Explicitly returns 200 (OK)
- Clear intent (though 200 is default for POST)

## Testing the Login

### Test 1: Successful Login

First, register a user:

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Then login:

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected response** (200 OK):

```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "name": "Test User",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Test 2: Wrong Password

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

**Expected response** (401 Unauthorized):

```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

### Test 3: Non-existent Email

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "password123"
  }'
```

**Expected response** (404 Not Found):

```json
{
  "statusCode": 404,
  "message": "Invalid email or password",
  "error": "Not Found"
}
```

**Note**: Same message as wrong password (security!)

### Test 4: Invalid Email Format

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123"
  }'
```

**Expected response** (400 Bad Request):

```json
{
  "statusCode": 400,
  "message": ["Please provide a valid email address"],
  "error": "Bad Request"
}
```

### Test 5: Inactive Account

First, deactivate a user (manually in database or add endpoint):

```sql
UPDATE users SET "isActive" = false WHERE email = 'test@example.com';
```

Then try to login:

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected response** (401 Unauthorized):

```json
{
  "statusCode": 401,
  "message": "Account is inactive",
  "error": "Unauthorized"
}
```

## Security Considerations

### 1. Generic Error Messages

**Why "Invalid email or password" for both?**

- Prevents email enumeration
- Attacker can't tell if email exists
- Slows down brute force attacks

### 2. Rate Limiting (Future)

**What we'll add later**:

- Limit login attempts per IP
- Prevent brute force attacks
- Temporary account lockout

### 3. Password Timing

**bcrypt is slow by design**:

- Takes ~100ms to verify password
- Slows down brute force attacks
- Acceptable delay for legitimate users

### 4. Never Log Passwords

**✅ DO**:

```typescript
console.log('Login attempt for:', email);
```

**❌ DON'T**:

```typescript
console.log('Password:', password); // ❌ Never!
```

## Key Concepts

### 1. Password Verification

```typescript
const isValid = await passwordService.comparePassword(
  plainPassword,
  hashedPassword,
);
```

- bcrypt handles salt extraction
- Secure comparison
- Returns boolean

### 2. Security Through Obscurity

```typescript
if (!user) {
  throw new NotFoundException('Invalid email or password');
}
```

- Generic error messages
- Don't reveal what's wrong
- Prevents information leakage

### 3. Account Status Check

```typescript
if (!user.isActive) {
  throw new UnauthorizedException('Account is inactive');
}
```

- Security feature
- Can disable accounts
- Clear message for legitimate users

## Common Mistakes

### ❌ Wrong: Reveal if Email Exists

```typescript
if (!user) {
  throw new NotFoundException('Email not found'); // ❌ Reveals email exists
}
```

### ✅ Correct: Generic Message

```typescript
if (!user) {
  throw new NotFoundException('Invalid email or password'); // ✅ Generic
}
```

### ❌ Wrong: Return Password

```typescript
return user; // ❌ Includes password!
```

### ✅ Correct: Remove Password

```typescript
const { password, ...userWithoutPassword } = user;
return userWithoutPassword; // ✅ No password!
```

## What's Next?

✅ **You've completed**: User login with password verification

➡️ **Next lesson**: [Lesson 03: JWT Tokens Deep Dive](../03-jwt-tokens-deep-dive/README.md)

## Key Takeaways

1. **Password verification**: Use bcrypt.compare() to verify passwords
2. **Generic error messages**: Don't reveal if email exists
3. **Check account status**: Verify user is active
4. **Never return passwords**: Remove from responses
5. **Proper HTTP status codes**: 200 for success, 401 for unauthorized

## Lesson 02 Summary

You've learned:

- ✅ Why we hash passwords (security)
- ✅ How bcrypt works (salting, hashing, rounds)
- ✅ How to hash passwords (PasswordService)
- ✅ How to register users (with password hashing)
- ✅ How to login users (with password verification)

**Next**: We'll add JWT tokens so users don't have to login every request!

---

**Congratulations!** You've completed Lesson 02. You now understand password security!
