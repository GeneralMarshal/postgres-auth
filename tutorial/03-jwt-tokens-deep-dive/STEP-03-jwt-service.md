# STEP 03: Create JWT Service

**Goal**: Create a service to generate and validate JWT tokens

## Why a Separate Service?

**Question**: Why create a separate service for JWT operations?

**Answer**:

- **Reusability**: Use in login, refresh token, password reset
- **Testability**: Easy to test token operations
- **Single Responsibility**: One service, one job
- **Consistency**: Same token logic everywhere

## Step 1: Create JWT Service

Create `src/auth/services/jwt.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
}

@Injectable()
export class AuthJwtService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generate JWT token for user
   * @param userId - User ID
   * @param email - User email
   * @returns JWT token string
   */
  async generateToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email: email,
    };

    return this.jwtService.signAsync(payload);
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (error) {
      return null;
    }
  }
}
```

**Let's break this down**:

### JwtPayload Interface

```typescript
export interface JwtPayload {
  sub: string; // User ID
  email: string;
}
```

- `sub` (subject): Standard JWT claim for user identifier
- `email`: Custom claim for user email
- Defines what data goes in the token

### generateToken()

```typescript
async generateToken(userId: string, email: string): Promise<string> {
  const payload: JwtPayload = {
    sub: userId,
    email: email,
  };

  return this.jwtService.signAsync(payload);
}
```

**What it does**:

1. Creates payload with user data
2. Signs token with secret (from config)
3. Returns token string

**Returns**: Token like `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`

### verifyToken()

```typescript
async verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    return payload;
  } catch (error) {
    return null;
  }
}
```

**What it does**:

1. Verifies token signature
2. Checks expiration
3. Returns payload if valid, null if invalid

**Why try-catch?**

- Invalid tokens throw errors
- We return `null` instead of throwing
- Easier error handling

## Step 2: Update Auth Module

Update `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthJwtService } from './services/jwt.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthJwtService],
  exports: [AuthJwtService],
})
export class AuthModule {}
```

**What changed**:

- Added `AuthJwtService` to `providers`
- Added `AuthJwtService` to `exports` (so other modules can use it)

## Step 3: Testing the Service

### Create a Test Script

Create `test-jwt.ts` in the root (temporary test file):

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthJwtService } from './src/auth/services/jwt.service';

async function testJwt() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwtService = app.get(AuthJwtService);

  // Generate token
  const token = await jwtService.generateToken('user-123', 'test@example.com');
  console.log('Generated token:', token);
  console.log('Token length:', token.length);

  // Verify token
  const payload = await jwtService.verifyToken(token);
  console.log('Decoded payload:', payload);

  // Test invalid token
  const invalidPayload = await jwtService.verifyToken('invalid-token');
  console.log('Invalid token result:', invalidPayload); // Should be null

  // Test expired token (wait for expiration or create with short expiry)
  await app.close();
}

testJwt();
```

### Run the Test

```bash
npx ts-node test-jwt.ts
```

**Expected output**:

```
Generated token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Token length: 150+
Decoded payload: { sub: 'user-123', email: 'test@example.com', iat: ..., exp: ... }
Invalid token result: null
```

### Clean Up

Delete the test file after verifying:

```bash
rm test-jwt.ts
```

## Understanding Token Structure

### Generated Token

When you generate a token, it includes:

```json
{
  "sub": "user-123",
  "email": "test@example.com",
  "iat": 1704067200, // Issued at (auto-added)
  "exp": 1704070800 // Expiration (auto-added)
}
```

**Auto-added claims**:

- `iat`: Issued at timestamp (when token was created)
- `exp`: Expiration timestamp (when token expires)

### Decoded Token

You can decode a token (without verifying) to see its contents:

```typescript
// Decode without verification (just for viewing)
const decoded = this.jwtService.decode(token);
console.log(decoded);
```

**Note**: `decode()` doesn't verify signature! Use `verifyAsync()` for validation.

## Advanced: Adding More Claims

You can add more data to the token payload:

```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;      // Optional
  role?: string;      // Optional
}

async generateToken(
  userId: string,
  email: string,
  name?: string,
  role?: string,
): Promise<string> {
  const payload: JwtPayload = {
    sub: userId,
    email: email,
    ...(name && { name }),  // Only include if provided
    ...(role && { role }),
  };

  return this.jwtService.signAsync(payload);
}
```

**⚠️ Remember**: Don't add sensitive data (passwords, credit cards, etc.)!

## Key Concepts

### 1. Token Generation

```typescript
const token = await jwtService.signAsync(payload);
```

- Creates signed token
- Includes expiration automatically
- Returns token string

### 2. Token Verification

```typescript
const payload = await jwtService.verifyAsync(token);
```

- Verifies signature
- Checks expiration
- Returns payload if valid
- Throws error if invalid

### 3. Error Handling

```typescript
try {
  const payload = await jwtService.verifyAsync(token);
  return payload;
} catch (error) {
  return null; // Invalid token
}
```

- Catches verification errors
- Returns null for invalid tokens
- Cleaner error handling

## Common Mistakes

### ❌ Wrong: Storing Password in Token

```typescript
const payload = {
  sub: userId,
  email: email,
  password: user.password, // ❌ Never!
};
```

### ✅ Correct: Only Safe Data

```typescript
const payload = {
  sub: userId,
  email: email,
  // ✅ Only non-sensitive data
};
```

### ❌ Wrong: Not Handling Errors

```typescript
const payload = await jwtService.verifyAsync(token); // ❌ Throws if invalid
```

### ✅ Correct: Handle Errors

```typescript
try {
  const payload = await jwtService.verifyAsync(token);
  return payload;
} catch {
  return null; // ✅ Handle gracefully
}
```

## What's Next?

✅ **You've completed**: JWT service for token generation and verification

➡️ **Next step**: [STEP-04-jwt-integration.md](./STEP-04-jwt-integration.md) - Integrate JWT with login endpoint

---

**Key Takeaways**:

1. **Separate service**: Encapsulates JWT logic
2. **Payload interface**: Defines token structure
3. **generateToken()**: Creates signed tokens
4. **verifyToken()**: Validates tokens safely
5. **Error handling**: Always handle verification errors
