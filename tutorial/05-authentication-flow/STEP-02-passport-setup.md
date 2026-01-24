# Step 02: Passport.js Setup

**Goal**: Install and configure Passport.js in your NestJS application

## Prerequisites

- ✅ Completed Step 01
- ✅ Understanding of authentication flow
- ✅ JWT tokens working
- ✅ Session validation service ready

## Installing Dependencies

Passport.js and JWT strategy are already installed! Check your `package.json`:

```json
{
  "dependencies": {
    "@nestjs/passport": "^11.0.5",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "@types/passport-jwt": "^4.0.1"
  }
}
```

**If not installed**, run:

```bash
npm install @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
```

## Understanding NestJS Passport Integration

**How NestJS integrates with Passport:**

1. **Strategy Class**: Extends `PassportStrategy`
2. **Strategy Validation**: Implements `validate()` method
3. **Module Registration**: Registers strategy in module
4. **Guard Usage**: Uses strategy to protect routes

## Project Structure

We'll create:

```
src/auth/
├── strategies/
│   └── jwt.strategy.ts      ← JWT strategy
├── guards/
│   └── jwt-auth.guard.ts    ← Authentication guard
└── auth.module.ts            ← Updated module
```

## Step 1: Create Strategies Directory

Create the directory structure:

```bash
mkdir -p src/auth/strategies
mkdir -p src/auth/guards
```

Or create them manually in your IDE.

## Step 2: Understanding JWT Strategy Options

**What the JWT Strategy Needs:**

1. **Secret**: To verify token signature
2. **Extraction Method**: How to get token from request
3. **Validation Method**: What to do with validated payload

**JWT Strategy Configuration:**

```typescript
{
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your-secret',
  ignoreExpiration: false,
}
```

**Token Extraction Options:**

- `fromAuthHeaderAsBearerToken()`: From `Authorization: Bearer <token>`
- `fromHeader('x-token')`: From custom header
- `fromUrlQueryParameter('token')`: From URL query
- `fromAuthHeaderWithScheme('Bearer')`: Custom scheme

We'll use `fromAuthHeaderAsBearerToken()` (standard).

## Step 3: Create JWT Strategy

Create `src/auth/strategies/jwt.strategy.ts`:

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

  /**
   * Validate JWT payload and session
   * This method is called automatically by Passport after token verification
   * @param payload - Decoded JWT payload
   * @returns User object attached to request.user
   */
  async validate(payload: JwtPayload) {
    // 1. Extract token ID from payload
    const tokenId = payload.jti;
    if (!tokenId) {
      throw new UnauthorizedException('Token missing identifier');
    }

    // 2. Check if session exists in Redis
    const sessionExists = await this.sessionService.sessionExists(tokenId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // 3. Return user object (attached to request.user)
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

**Breaking it down:**

1. **Extends PassportStrategy**: Makes it a Passport strategy
2. **Constructor**: Configures JWT extraction and secret
3. **validate()**: Called after token verification
4. **Session Check**: Validates session in Redis
5. **Return Value**: Attached to `request.user`

## Step 4: Update Auth Module

Update `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import { AuthJwtService } from './services/jwt/jwt.service';
import { CommonModule } from 'src/common/common.module';
import { SessionService } from './services/session/session.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    CommonModule,
    PassportModule, // ← Add Passport module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '1h');
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthJwtService,
    SessionService,
    JwtStrategy, // ← Add strategy as provider
  ],
  exports: [JwtModule, AuthJwtService, SessionService, PassportModule],
})
export class AuthModule {}
```

**Key changes:**

1. ✅ Imported `PassportModule`
2. ✅ Added `JwtStrategy` to providers
3. ✅ Exported `PassportModule` for use in other modules

## Step 5: Understanding Strategy Flow

**How the strategy works:**

```
1. Request arrives with Authorization header
   ↓
2. Passport extracts token using ExtractJwt.fromAuthHeaderAsBearerToken()
   ↓
3. Passport verifies token signature using JWT_SECRET
   ↓
4. Passport checks expiration (ignoreExpiration: false)
   ↓
5. If valid, calls validate() method
   ↓
6. validate() checks session in Redis
   ↓
7. validate() returns user object
   ↓
8. User object attached to request.user
   ↓
9. Request proceeds to route handler
```

**If any step fails:**

- Invalid signature → UnauthorizedException
- Expired token → UnauthorizedException
- Missing session → UnauthorizedException

## Step 6: Test Strategy Setup

**Verify imports work:**

1. Start your app:
   ```bash
   npm run start:dev
   ```

2. Check for errors:
   - Should compile without errors
   - No missing dependencies

**Common Issues:**

1. **"Cannot find module '@nestjs/passport'"**
   - Run: `npm install @nestjs/passport passport`

2. **"Cannot find module 'passport-jwt'"**
   - Run: `npm install passport-jwt`

3. **"JWT_SECRET is not defined"**
   - Check your `.env` file has `JWT_SECRET`

## Understanding Strategy vs Service

**What's the difference?**

- **AuthJwtService**: Generates and verifies tokens (manual)
- **JwtStrategy**: Integrates with Passport (automatic)

**When to use each:**

- **Service**: When you need manual control (login, custom validation)
- **Strategy**: When using guards (automatic route protection)

**We use both:**

- Service: Generate tokens in login
- Strategy: Validate tokens in guards

## Key Takeaways

1. ✅ **PassportModule** must be imported
2. ✅ **Strategy** extends `PassportStrategy(Strategy)`
3. ✅ **validate()** method is called after token verification
4. ✅ **Session validation** happens in validate()
5. ✅ **Return value** becomes `request.user`
6. ✅ **Strategy** must be in providers array

## What's Next?

In the next step, we'll:
- ✅ Create authentication guards
- ✅ Use guards to protect routes
- ✅ Extract user from request

---

**Ready?** Move to [STEP-03-jwt-strategy.md](./STEP-03-jwt-strategy.md)!

**Note**: Actually, we already created the JWT strategy in this step! The next step will focus on creating guards and using them.
