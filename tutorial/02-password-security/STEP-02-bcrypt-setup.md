# STEP 02: Install and Configure bcrypt

**Goal**: Set up bcrypt and create a password utility service

## Installing bcrypt

### 1. Install Package

We already installed `bcryptjs` in Lesson 01, but let's verify:

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Why `bcryptjs` instead of `bcrypt`?**

- `bcryptjs`: Pure JavaScript (works everywhere)
- `bcrypt`: Native bindings (faster but can have install issues)
- For learning, `bcryptjs` is easier and works the same

### 2. Verify Installation

Check `package.json`:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

## Creating Password Utility Service

### Why a Separate Service?

**Question**: Why create a separate service for password hashing?

**Answer**:

- **Reusability**: Use in registration, password reset, change password
- **Testability**: Easy to test password operations
- **Single Responsibility**: One service, one job
- **Consistency**: Same hashing logic everywhere

### Step 1: Create Password Service

Create `src/common/services/password.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  /**
   * Hash a plaintext password
   * @param password - Plaintext password to hash
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare plaintext password with hashed password
   * @param plainPassword - Password entered by user
   * @param hashedPassword - Stored hash from database
   * @returns true if passwords match, false otherwise
   */
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
```

**Let's break this down**:

#### @Injectable()

```typescript
@Injectable()
export class PasswordService {
```

- Makes this class injectable (can be used with DI)
- Required for NestJS to manage it

#### saltRounds

```typescript
private readonly saltRounds = 10;
```

- **10 rounds** is the standard (good balance)
- `readonly` = can't be changed after initialization
- `private` = only accessible within this class

**Why 10?**

- Less than 10: Too fast (weak security)
- More than 12: Too slow (bad user experience)
- 10: Industry standard (good balance)

#### hashPassword()

```typescript
async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, this.saltRounds);
}
```

**What it does**:

1. Takes plaintext password
2. Generates salt automatically
3. Hashes password with salt (10 rounds)
4. Returns hash (includes salt)

**Returns**: Hash string like `"$2a$10$N9qo8uLOickgx2ZMRZoMye..."`

#### comparePassword()

```typescript
async comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
```

**What it does**:

1. Takes plaintext password (from user input)
2. Takes stored hash (from database)
3. Extracts salt from stored hash
4. Hashes plaintext with extracted salt
5. Compares the two hashes
6. Returns `true` if match, `false` otherwise

**Why async?**

- bcrypt operations are CPU-intensive
- Async prevents blocking the event loop
- Better performance

### Step 2: Create Common Module

Since this is a shared service, create a common module:

Create `src/common/common.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PasswordService } from './services/password.service';

@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class CommonModule {}
```

**What this does**:

- Makes `PasswordService` available
- Exports it so other modules can use it

### Step 3: Import CommonModule

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UserModule } from './user/users.module';
import { CommonModule } from './common/common.module'; // Add this

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UserModule,
    CommonModule, // Add this
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Testing the Service

### Create a Test Script

Create `test-password.ts` in the root (temporary test file):

```typescript
import * as bcrypt from 'bcryptjs';

async function testPassword() {
  const password = 'mypassword123';

  // Hash password
  const hash = await bcrypt.hash(password, 10);
  console.log('Original password:', password);
  console.log('Hashed password:', hash);

  // Compare passwords
  const isValid1 = await bcrypt.compare(password, hash);
  console.log('Correct password matches:', isValid1); // Should be true

  const isValid2 = await bcrypt.compare('wrongpassword', hash);
  console.log('Wrong password matches:', isValid2); // Should be false

  // Test that same password produces different hashes (due to salt)
  const hash2 = await bcrypt.hash(password, 10);
  console.log('Same password, different hash:', hash !== hash2); // Should be true
  console.log(
    'But both verify correctly:',
    (await bcrypt.compare(password, hash)) &&
      (await bcrypt.compare(password, hash2)),
  ); // Should be true
}

testPassword();
```

### Run the Test

```bash
npx ts-node test-password.ts
```

**Expected output**:

```
Original password: mypassword123
Hashed password: $2a$10$N9qo8uLOickgx2ZMRZoMye...
Correct password matches: true
Wrong password matches: false
Same password, different hash: true
But both verify correctly: true
```

**What this proves**:

- ✅ Hashing works
- ✅ Comparison works
- ✅ Same password = different hashes (salting works!)
- ✅ Both hashes verify correctly

### Clean Up

Delete the test file after verifying:

```bash
rm test-password.ts
```

## Understanding the Hash Format

The bcrypt hash looks like this:

```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**Breaking it down**:

- `$2a$` = bcrypt algorithm version
- `10` = number of rounds
- `N9qo8uLOickgx2ZMRZoMye` = salt (22 characters)
- `IjZAgcfl7p92ldGxad68LJZdL17lhWy` = hash (31 characters)

**Total**: 60 characters

**Why this format?**

- Salt is embedded in the hash
- `bcrypt.compare()` extracts salt automatically
- No need to store salt separately!

## Key Concepts

### 1. Service Pattern

```typescript
@Injectable()
export class PasswordService {
  // Business logic here
}
```

- Encapsulates password operations
- Reusable across the app
- Easy to test

### 2. Dependency Injection

```typescript
constructor(private passwordService: PasswordService) {}
```

- Other services can inject `PasswordService`
- NestJS handles creation automatically

### 3. Async Operations

```typescript
async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, this.saltRounds);
}
```

- bcrypt is CPU-intensive
- Async prevents blocking
- Returns Promise

## Common Mistakes

### ❌ Wrong: Synchronous Hashing

```typescript
const hash = bcrypt.hashSync(password, 10); // ❌ Blocks event loop
```

### ✅ Correct: Asynchronous Hashing

```typescript
const hash = await bcrypt.hash(password, 10); // ✅ Non-blocking
```

### ❌ Wrong: Too Few Rounds

```typescript
const hash = await bcrypt.hash(password, 5); // ❌ Too weak
```

### ✅ Correct: Standard Rounds

```typescript
const hash = await bcrypt.hash(password, 10); // ✅ Industry standard
```

## What's Next?

✅ **You've completed**: bcrypt setup and password utility service

➡️ **Next step**: [STEP-03-registration.md](./STEP-03-registration.md) - Build user registration endpoint

## Key Takeaways

1. **bcryptjs is easy to use**: Simple API, works everywhere
2. **Service pattern**: Encapsulate password logic in a service
3. **Async is important**: Prevents blocking the event loop
4. **10 rounds is standard**: Good balance of security and speed
5. **Hash includes salt**: No need to store salt separately

---

**Ready?** Let's build the registration endpoint!
