# STEP 03: Build Registration Endpoint

**Goal**: Create user registration with password hashing and validation

## What We're Building

A complete registration endpoint that:

1. Validates user input (email, password)
2. Checks if user already exists
3. Hashes the password
4. Saves user to database
5. Returns success response

## Step-by-Step Implementation

### Step 1: Create Registration DTO

Create `src/users/dto/create-user.dto.ts`:

```typescript
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsString()
  @IsOptional()
  name?: string;
}
```

**Let's understand the decorators**:

#### @IsEmail()

```typescript
@IsEmail({}, { message: 'Please provide a valid email address' })
email: string;
```

- Validates email format
- Custom error message if invalid

#### @IsNotEmpty()

```typescript
@IsNotEmpty({ message: 'Email is required' })
```

- Ensures field is not empty
- Custom error message

#### @MinLength(8)

```typescript
@MinLength(8, { message: 'Password must be at least 8 characters long' })
password: string;
```

- Minimum 8 characters
- Security best practice

#### @IsOptional()

```typescript
@IsOptional()
name?: string;
```

- Field is optional (can be undefined)
- `?` in TypeScript = optional property

**Why DTOs?**

- **Validation**: Automatic validation before reaching controller
- **Type Safety**: TypeScript knows the shape of data
- **Documentation**: Clear what the endpoint expects
- **Security**: Prevents invalid data

### Step 2: Update User Service

Update `src/users/users.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { PasswordService } from '../common/services/password.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService, // Inject PasswordService
  ) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // Check if user already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await this.passwordService.hashPassword(
      createUserDto.password,
    );

    // Create user in database
    const savedUser = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword, // Store hashed password, not plaintext!
        name: createUserDto.name,
        isActive: true,
      },
    });

    // Return user without password (security!)
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }
}
```

**Let's break down the create method**:

#### Check for Existing User

```typescript
const existingUser = await this.findByEmail(createUserDto.email);
if (existingUser) {
  throw new ConflictException('User with this email already exists');
}
```

**Why check?**

- Email should be unique
- Prevents duplicate accounts
- `ConflictException` = HTTP 409 status code

#### Hash Password

```typescript
const hashedPassword = await this.passwordService.hashPassword(
  createUserDto.password,
);
```

**Important**: Hash BEFORE saving to database!

#### Create User in Database

```typescript
const savedUser = await this.prisma.user.create({
  data: {
    email: createUserDto.email,
    password: hashedPassword, // ✅ Hashed, not plaintext!
    name: createUserDto.name,
    isActive: true,
  },
});
```

- `create()` = creates and saves user in one operation
- Sets `isActive: true` by default
- Returns saved user with generated ID

#### Return Without Password

```typescript
const { password, ...userWithoutPassword } = savedUser;
return userWithoutPassword;
```

**Why remove password?**

- **Security**: Never send password hash in response
- Even hashed passwords shouldn't be exposed
- Uses destructuring to exclude password

**TypeScript trick**:

```typescript
Omit<User, 'password'>;
```

- Return type excludes `password` field
- Type-safe way to remove sensitive data

### Step 3: Update Users Module

Update `src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CommonModule } from '../common/common.module'; // Add this

@Module({
  imports: [
    PrismaModule, // Provides PrismaService
    CommonModule, // Add this - provides PasswordService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

**Why import CommonModule?**

- `UsersService` needs `PasswordService`
- `CommonModule` exports `PasswordService`
- Import makes it available for injection

### Step 4: Update Users Controller

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
  @HttpCode(HttpStatus.CREATED) // Returns 201 instead of 200
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

**What's new**:

#### @HttpCode(HttpStatus.CREATED)

```typescript
@HttpCode(HttpStatus.CREATED)
async create(@Body() createUserDto: CreateUserDto) {
```

- Returns HTTP 201 (Created) instead of 200 (OK)
- REST API best practice for POST requests
- Indicates resource was successfully created

#### @Body() with DTO

```typescript
@Body() createUserDto: CreateUserDto
```

- Extracts JSON body from request
- Validates against `CreateUserDto`
- If invalid, NestJS automatically returns 400 Bad Request

### Step 5: Enable Validation

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if unknown properties
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

**What ValidationPipe does**:

- **whitelist: true**: Removes properties not in DTO
- **forbidNonWhitelisted: true**: Rejects requests with extra properties
- **transform: true**: Converts plain objects to DTO instances

**Example**:

```json
// Request
{
  "email": "test@example.com",
  "password": "password123",
  "hackerField": "malicious" // ← Removed by whitelist
}
```

## Testing the Registration

### Test 1: Valid Registration

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Expected response** (201 Created):

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

**Notice**: No `password` field in response! ✅

### Test 2: Invalid Email

```bash
curl -X POST http://localhost:3000/users \
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

### Test 3: Short Password

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "short"
  }'
```

**Expected response** (400 Bad Request):

```json
{
  "statusCode": 400,
  "message": ["Password must be at least 8 characters long"],
  "error": "Bad Request"
}
```

### Test 4: Duplicate Email

```bash
# Try to register same email twice
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected response** (409 Conflict):

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

### Test 5: Verify Password is Hashed

Connect to database:

```bash
docker exec -it auth-tutorial-postgres psql -U auth_user -d auth_tutorial
```

Query users:

```sql
SELECT email, password FROM users;
```

**Expected**:

```
email              | password
-------------------+----------------------------------------------------------
test@example.com   | $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**Notice**: Password is hashed! ✅ Not plaintext!

## Key Concepts

### 1. DTO Validation

```typescript
@IsEmail()
email: string;
```

- Automatic validation before controller
- Clear error messages
- Type-safe

### 2. Password Hashing

```typescript
const hashedPassword = await this.passwordService.hashPassword(password);
```

- Always hash before saving
- Never store plaintext
- Use async (non-blocking)

### 3. Security: Don't Return Password

```typescript
const { password, ...userWithoutPassword } = savedUser;
return userWithoutPassword;
```

- Remove sensitive data from responses
- Even hashed passwords shouldn't be exposed

### 4. Error Handling

```typescript
if (existingUser) {
  throw new ConflictException('User already exists');
}
```

- Use appropriate HTTP status codes
- Clear error messages
- NestJS handles conversion to HTTP response

## Common Mistakes

### ❌ Wrong: Store Plaintext Password

```typescript
password: createUserDto.password, // ❌ Never do this!
```

### ✅ Correct: Hash Password

```typescript
password: hashedPassword, // ✅ Always hash!
```

### ❌ Wrong: Return Password in Response

```typescript
return savedUser; // ❌ Includes password!
```

### ✅ Correct: Remove Password

```typescript
const { password, ...userWithoutPassword } = savedUser;
return userWithoutPassword; // ✅ No password!
```

## What's Next?

✅ **You've completed**: User registration with password hashing

➡️ **Next step**: [STEP-04-login.md](./STEP-04-login.md) - Build login endpoint

## Key Takeaways

1. **DTOs validate input**: Automatic validation with clear errors
2. **Always hash passwords**: Never store plaintext
3. **Check for duplicates**: Prevent duplicate accounts
4. **Remove sensitive data**: Don't return passwords in responses
5. **Proper HTTP status codes**: 201 for creation, 409 for conflicts

---

**Ready?** Let's build the login endpoint!
