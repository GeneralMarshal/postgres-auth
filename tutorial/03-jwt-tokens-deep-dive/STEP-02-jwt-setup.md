# STEP 02: Install and Configure JWT

**Goal**: Set up JWT module in NestJS and configure it properly

## Installing JWT Packages

### 1. Verify Installation

We already installed JWT packages in Lesson 01, but let's verify:

Check `package.json`:

```json
{
  "dependencies": {
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/passport": "^11.0.5",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1"
  },
  "devDependencies": {
    "@types/passport-jwt": "^4.0.1"
  }
}
```

**If not installed**, run:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt
```

### 2. What Each Package Does

- **`@nestjs/jwt`**: NestJS JWT utilities (sign, verify tokens)
- **`@nestjs/passport`**: NestJS integration for Passport.js
- **`passport`**: Authentication middleware framework
- **`passport-jwt`**: JWT strategy for Passport
- **`@types/passport-jwt`**: TypeScript types

## Configuring JWT Module

### Step 1: Update Environment Variables

Make sure your `.env` file has JWT configuration:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=1h
```

**Important**:

- `JWT_SECRET`: Must be at least 32 characters long
- Use a strong, random secret (never commit to git!)
- `JWT_EXPIRES_IN`: Token expiration time (1h, 1d, 7d, etc.)

**Generate a strong secret**:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Create JWT Module

Create `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
  exports: [JwtModule],
})
export class AuthModule {}
```

**Let's break this down**:

#### JwtModule.registerAsync()

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    // Configuration
  }),
  inject: [ConfigService],
});
```

**Why `registerAsync`?**

- Loads configuration from environment variables
- Better than `register()` which uses hardcoded values
- Follows NestJS best practices

#### Configuration

```typescript
secret: configService.get<string>('JWT_SECRET'),
signOptions: {
  expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
},
```

- `secret`: Secret key for signing tokens (from `.env`)
- `expiresIn`: Token expiration time (default: '1h')

**Expiration formats**:

- `'1h'` = 1 hour
- `'1d'` = 1 day
- `'7d'` = 7 days
- `'15m'` = 15 minutes

#### exports: [JwtModule]

```typescript
exports: [JwtModule],
```

- Makes `JwtModule` available to other modules
- Other modules can inject `JwtService`

### Step 3: Import AuthModule in AppModule

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UserModule } from './user/users.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module'; // Add this

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UserModule,
    CommonModule,
    AuthModule, // Add this
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Understanding the Configuration

### Why ConfigService?

**❌ Bad (hardcoded)**:

```typescript
JwtModule.register({
  secret: 'hardcoded-secret',
  signOptions: { expiresIn: '1h' },
});
```

**Problems**:

- Secret in code (security risk)
- Can't change without code change
- Different values per environment

**✅ Good (environment variables)**:

```typescript
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') },
  }),
});
```

**Benefits**:

- Secret in `.env` (not in code)
- Easy to change per environment
- Follows 12-factor app principles

### JWT Secret Best Practices

1. **Length**: At least 32 characters
2. **Random**: Use crypto.randomBytes()
3. **Different per environment**: Dev, staging, production
4. **Never commit**: Keep in `.env` (already in `.gitignore`)
5. **Rotate regularly**: Change periodically

### Token Expiration Strategy

**Access Token**:

- **Short-lived**: 15 minutes to 1 hour
- **Why**: Limits damage if stolen
- **Trade-off**: More frequent refreshes

**Refresh Token**:

- **Long-lived**: 7-30 days
- **Why**: Better user experience
- **Trade-off**: More secure storage needed

**For this tutorial**: We'll use 1 hour for access tokens.

## Testing the Setup

### Verify Module is Loaded

Start your server:

```bash
npm run start:dev
```

**Expected**: Server starts without errors

**If you see errors**:

- Check `.env` file exists
- Verify `JWT_SECRET` is set
- Make sure `ConfigModule` is imported globally

### Check Environment Variables

Create a test endpoint to verify (temporary):

```typescript
// In app.controller.ts (temporary)
@Get('test-jwt-config')
testJwtConfig(@Inject(ConfigService) configService: ConfigService) {
  return {
    secret: configService.get('JWT_SECRET') ? 'Set' : 'Missing',
    expiresIn: configService.get('JWT_EXPIRES_IN', '1h'),
  };
}
```

**Test**:

```bash
curl http://localhost:3000/test-jwt-config
```

**Expected**:

```json
{
  "secret": "Set",
  "expiresIn": "1h"
}
```

**Then remove the test endpoint!**

## Key Concepts

### 1. Async Configuration

```typescript
registerAsync({
  useFactory: async (configService: ConfigService) => ({
    // Config
  }),
});
```

- Loads config asynchronously
- Can inject other services
- Better for environment-based config

### 2. Module Exports

```typescript
exports: [JwtModule];
```

- Makes JWT available to other modules
- Other modules can inject `JwtService`

### 3. Environment Variables

```env
JWT_SECRET=your-secret
JWT_EXPIRES_IN=1h
```

- Configuration outside code
- Different per environment
- Secure (not in git)

## Common Mistakes

### ❌ Wrong: Hardcoded Secret

```typescript
JwtModule.register({
  secret: 'my-secret', // ❌ In code!
});
```

### ✅ Correct: Environment Variable

```typescript
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'), // ✅ From .env
  }),
});
```

### ❌ Wrong: Weak Secret

```env
JWT_SECRET=secret123  # ❌ Too short, predictable
```

### ✅ Correct: Strong Secret

```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6  # ✅ Long, random
```

## What's Next?

✅ **You've completed**: JWT module setup and configuration

➡️ **Next step**: [STEP-03-jwt-service.md](./STEP-03-jwt-service.md) - Create JWT service for token generation

---

**Key Takeaways**:

1. Use `registerAsync()` for environment-based config
2. Store JWT_SECRET in `.env` (never in code)
3. Use strong, random secrets (32+ characters)
4. Export JwtModule to make it available
5. Configure expiration time appropriately
