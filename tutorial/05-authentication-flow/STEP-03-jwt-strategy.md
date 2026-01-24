# Step 03: JWT Strategy Implementation

**Goal**: Complete the JWT strategy implementation with proper error handling and session validation

## Prerequisites

- ✅ Completed Step 02
- ✅ Passport.js configured
- ✅ Strategy structure created

## Review: What We Built

In Step 02, we created the JWT strategy. Let's review and enhance it.

## Step 1: Verify Strategy Implementation

Check that `src/auth/strategies/jwt.strategy.ts` exists and matches:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthJwtService } from '../services/jwt/jwt.service';
import { SessionService } from '../services/session/session.service';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  name?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private jwtService: AuthJwtService,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const tokenId = payload.jti;
    if (!tokenId) {
      throw new UnauthorizedException('Token missing identifier');
    }

    const sessionExists = await this.sessionService.sessionExists(tokenId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tokenId: payload.jti,
    };
  }
}
```

## Step 2: Understanding Strategy Configuration

**Configuration Options Explained:**

```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // ↑ How to extract token from request
  // Options:
  // - fromAuthHeaderAsBearerToken() → Authorization: Bearer <token>
  // - fromHeader('x-token') → Custom header
  // - fromUrlQueryParameter('token') → ?token=...
  
  secretOrKey: configService.get<string>('JWT_SECRET'),
  // ↑ Secret to verify token signature
  // Must match the secret used to sign tokens
  
  ignoreExpiration: false,
  // ↑ Whether to ignore expiration
  // false = check expiration (recommended)
  // true = ignore expiration (not recommended)
});
```

## Step 3: Understanding validate() Method

**What happens in validate():**

1. **Token Already Verified**: Passport already verified signature and expiration
2. **Payload Available**: Decoded payload is passed to validate()
3. **Session Check**: We check Redis for active session
4. **Return User**: Returned object becomes `request.user`

**Why we check session:**

Even though the token is valid, it might be:
- ✅ Revoked (user logged out)
- ✅ Expired in Redis (TTL expired)
- ✅ Blacklisted

**Flow:**

```
Token Verified (Passport)
    ↓
validate() called
    ↓
Check session in Redis
    ↓
If exists → Return user
If not → Throw UnauthorizedException
```

## Step 4: Error Handling

**What errors can occur:**

1. **Missing Token ID** (`jti`):
   ```typescript
   if (!tokenId) {
     throw new UnauthorizedException('Token missing identifier');
   }
   ```

2. **Session Not Found**:
   ```typescript
   if (!sessionExists) {
     throw new UnauthorizedException('Session expired or revoked');
   }
   ```

3. **Invalid Token** (handled by Passport):
   - Invalid signature → Thrown before validate()
   - Expired token → Thrown before validate()

**Error Response:**

All errors return:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Step 5: User Object Structure

**What we return from validate():**

```typescript
return {
  userId: payload.sub,      // User ID from token
  email: payload.email,     // User email
  name: payload.name,       // User name (optional)
  role: payload.role,       // User role (optional)
  tokenId: payload.jti,      // Token ID for session management
};
```

**This becomes `request.user`:**

```typescript
@Get('profile')
getProfile(@Request() req) {
  console.log(req.user); // { userId, email, name, role, tokenId }
}
```

## Step 6: Verify Module Registration

Ensure `src/auth/auth.module.ts` includes:

```typescript
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    CommonModule,
    PassportModule,
    // ... JWT module config
  ],
  providers: [
    AuthJwtService,
    SessionService,
    JwtStrategy, // ← Must be here
  ],
  exports: [
    JwtModule,
    AuthJwtService,
    SessionService,
    PassportModule, // ← Must export for guards
  ],
})
export class AuthModule {}
```

## Step 7: Testing Strategy (Manual Test)

**Test the strategy works:**

1. **Start your app:**
   ```bash
   npm run start:dev
   ```

2. **Login to get a token:**
   ```bash
   POST http://localhost:3000/users/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

3. **Copy the accessToken from response**

4. **Test token extraction (manual):**
   ```typescript
   // In a test endpoint (temporary)
   @Get('test-token')
   testToken(@Headers('authorization') auth: string) {
     const token = auth?.split(' ')[1];
     return { token, hasToken: !!token };
   }
   ```

**Expected behavior:**
- Strategy should extract token from `Authorization: Bearer <token>`
- Strategy should verify token signature
- Strategy should check session in Redis

## Step 8: Common Issues and Solutions

**Issue 1: "Cannot find module 'passport-jwt'"**

```bash
npm install passport-jwt @types/passport-jwt
```

**Issue 2: "JWT_SECRET is not defined"**

Check `.env`:
```env
JWT_SECRET=your-secret-key-here
```

**Issue 3: "Session service not found"**

Ensure `SessionService` is in `CommonModule` exports:
```typescript
@Module({
  providers: [RedisService, PasswordService, SessionService],
  exports: [RedisService, PasswordService, SessionService],
})
export class CommonModule {}
```

**Issue 4: "Strategy not found"**

Ensure `JwtStrategy` is in `AuthModule` providers.

## Step 9: Strategy vs Manual Validation

**Before (Manual):**

```typescript
@Get('profile')
async getProfile(@Headers('authorization') auth: string) {
  const token = auth?.split(' ')[1];
  const payload = await this.jwtService.verifyToken(token);
  if (!payload) throw new UnauthorizedException();
  
  const tokenId = payload.jti;
  const exists = await this.sessionService.sessionExists(tokenId);
  if (!exists) throw new UnauthorizedException();
  
  // Use payload.sub as userId
}
```

**After (With Strategy):**

```typescript
@UseGuards(AuthGuard('jwt'))
@Get('profile')
async getProfile(@Request() req) {
  // req.user is automatically populated!
  const userId = req.user.userId;
}
```

**Benefits:**
- ✅ Cleaner code
- ✅ Reusable
- ✅ Automatic validation
- ✅ Consistent error handling

## Key Takeaways

1. ✅ **Strategy validates** token signature and expiration automatically
2. ✅ **validate() method** checks session and returns user
3. ✅ **Return value** becomes `request.user`
4. ✅ **Error handling** throws UnauthorizedException
5. ✅ **Module registration** requires strategy in providers

## What's Next?

In the next step, we'll:
- ✅ Create authentication guards
- ✅ Use guards to protect routes
- ✅ Extract user from request

---

**Ready?** Move to [STEP-04-authentication-guards.md](./STEP-04-authentication-guards.md)!
