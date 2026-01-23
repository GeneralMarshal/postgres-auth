# STEP 03: Session Storage Implementation

**Goal**: Implement session storage and validation using Redis

## Overview

In this step, we'll:

1. Create a session service to manage sessions
2. Store sessions in Redis when users log in
3. Validate sessions on each request
4. Integrate with existing login flow

## Creating Session Service

### Step 1: Create Session Service

Create `src/auth/services/session/session.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/services/redis.service';
import { ConfigService } from '@nestjs/config';

export interface SessionData {
  userId: string;
  email: string;
  createdAt: string;
}

@Injectable()
export class SessionService {
  private readonly sessionPrefix = 'session:';
  private readonly defaultTTL: number;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    // Get TTL from config or default to 1 hour (3600 seconds)
    this.defaultTTL = this.configService.get<number>('REDIS_TTL', 3600);
  }

  /**
   * Create a new session
   * @param tokenId - Unique token identifier (from JWT)
   * @param sessionData - User data to store
   * @param ttl - Time to live in seconds (optional)
   */
  async createSession(
    tokenId: string,
    sessionData: SessionData,
    ttl?: number,
  ): Promise<void> {
    const key = this.getSessionKey(tokenId);
    const value = JSON.stringify(sessionData);
    const sessionTTL = ttl || this.defaultTTL;

    await this.redisService.set(key, value, sessionTTL);
  }

  /**
   * Get session data by token ID
   * @param tokenId - Token identifier
   * @returns Session data or null if not found
   */
  async getSession(tokenId: string): Promise<SessionData | null> {
    const key = this.getSessionKey(tokenId);
    const value = await this.redisService.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as SessionData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if session exists
   * @param tokenId - Token identifier
   * @returns true if session exists, false otherwise
   */
  async sessionExists(tokenId: string): Promise<boolean> {
    const key = this.getSessionKey(tokenId);
    const exists = await this.redisService.exists(key);
    return exists === 1;
  }

  /**
   * Delete a session (logout)
   * @param tokenId - Token identifier
   */
  async deleteSession(tokenId: string): Promise<void> {
    const key = this.getSessionKey(tokenId);
    await this.redisService.del(key);
  }

  /**
   * Refresh session TTL (extend expiration)
   * @param tokenId - Token identifier
   * @param ttl - New TTL in seconds
   */
  async refreshSession(tokenId: string, ttl?: number): Promise<void> {
    const key = this.getSessionKey(tokenId);
    const sessionTTL = ttl || this.defaultTTL;
    await this.redisService.expire(key, sessionTTL);
  }

  /**
   * Get session key for Redis
   * @param tokenId - Token identifier
   * @returns Redis key
   */
  private getSessionKey(tokenId: string): string {
    return `${this.sessionPrefix}${tokenId}`;
  }
}
```

**Let's break this down:**

#### SessionData Interface

```typescript
export interface SessionData {
  userId: string;
  email: string;
  createdAt: string;
}
```

- Stores essential user info in session
- `createdAt`: Timestamp when session was created

#### Session Key Format

```typescript
private readonly sessionPrefix = 'session:';
private getSessionKey(tokenId: string): string {
  return `${this.sessionPrefix}${tokenId}`;
}
```

- Redis key format: `session:${tokenId}`
- Example: `session:abc123def456`
- Prefix helps organize keys

#### Create Session

```typescript
async createSession(tokenId: string, sessionData: SessionData, ttl?: number)
```

- Stores session in Redis with TTL
- TTL matches JWT expiration time
- Session auto-expires when token expires

#### Get Session

```typescript
async getSession(tokenId: string): Promise<SessionData | null>
```

- Retrieves session from Redis
- Returns `null` if session doesn't exist (revoked/expired)

#### Session Exists

```typescript
async sessionExists(tokenId: string): Promise<boolean>
```

- Quick check if session exists
- Used for validation

### Step 2: Export SessionService from AuthModule

Update `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthJwtService } from './services/jwt/jwt.service';
import { SessionService } from './services/session/session.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule, // Add this for RedisService
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
  providers: [AuthJwtService, SessionService],
  exports: [JwtModule, AuthJwtService, SessionService],
})
export class AuthModule {}
```

## Updating JWT Service

We need to extract a unique token ID from JWT. Let's update `AuthJwtService`:

### Update AuthJwtService

Update `src/auth/services/jwt/jwt.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string; // JWT ID - unique token identifier
  name?: string;
  role?: string;
}

@Injectable()
export class AuthJwtService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generate JWT token with unique ID
   */
  async generateToken(
    userId: string,
    email: string,
    name?: string,
    role?: string,
  ): Promise<{ token: string; tokenId: string }> {
    // Generate unique token ID
    const tokenId = randomBytes(16).toString('hex');

    const payload: JwtPayload = {
      sub: userId,
      email: email,
      jti: tokenId, // JWT ID for session management
      ...(name && { name }),
      ...(role && { role }),
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      tokenId,
    };
  }

  /**
   * Verify token and extract payload
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Extract token ID from payload
   */
  getTokenId(payload: JwtPayload): string | null {
    return payload.jti || null;
  }
}
```

**Key changes:**

- Added `jti` (JWT ID) to payload - unique identifier for each token
- `generateToken` now returns both `token` and `tokenId`
- Added `getTokenId` helper method

## Updating Login Service

Now let's integrate session storage with the login flow:

### Update UsersService

Update `src/user/users.service.ts`:

```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { User } from '@prisma/client';
import { PasswordService } from 'src/common/services/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthJwtService } from 'src/auth/services/jwt/jwt.service';
import { SessionService } from 'src/auth/services/session/session.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private jwtService: AuthJwtService,
    private sessionService: SessionService, // Add this
  ) {}

  // ... existing methods ...

  async login(loginUserDto: LoginUserDto) {
    const { email } = loginUserDto;
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('Invalid Email or Password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is Inactive');
    }

    // Verify password
    const isVerified = await this.passwordService.comparePassword(
      loginUserDto.password,
      user.password,
    );

    if (!isVerified) {
      throw new UnauthorizedException('Invalid Email or Password');
    }

    // Generate JWT token with unique ID
    const { token, tokenId } = await this.jwtService.generateToken(
      user.id,
      user.email,
    );

    // Create session in Redis
    await this.sessionService.createSession(tokenId, {
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: token,
    };
  }

  // ... rest of methods ...
}
```

**What we did:**

1. Injected `SessionService`
2. Updated `generateToken` call to get both `token` and `tokenId`
3. Created session in Redis after token generation
4. Session TTL matches JWT expiration automatically

## Creating Session Validation Helper

Let's create a helper to validate sessions:

### Create Session Guard (Preview)

We'll create a guard in the next lesson, but for now, here's a validation helper:

Create `src/auth/services/session/session-validator.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthJwtService } from '../jwt/jwt.service';
import { SessionService } from './session.service';

@Injectable()
export class SessionValidatorService {
  constructor(
    private jwtService: AuthJwtService,
    private sessionService: SessionService,
  ) {}

  /**
   * Validate token and session
   * @param token - JWT token string
   * @returns User ID if valid, throws if invalid
   */
  async validateTokenAndSession(token: string): Promise<string> {
    // 1. Verify JWT signature and expiration
    const payload = await this.jwtService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 2. Extract token ID
    const tokenId = this.jwtService.getTokenId(payload);
    if (!tokenId) {
      throw new UnauthorizedException('Token missing identifier');
    }

    // 3. Check if session exists in Redis
    const sessionExists = await this.sessionService.sessionExists(tokenId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // 4. Return user ID
    return payload.sub;
  }
}
```

**Validation flow:**

1. Verify JWT signature and expiration
2. Extract token ID from payload
3. Check if session exists in Redis
4. Return user ID if valid

## Testing Session Storage

### Test Login Endpoint

1. **Start your app:**

   ```bash
   npm run start:dev
   ```

2. **Login with a user:**

   ```bash
   curl -X POST http://localhost:3000/users/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

3. **Check Redis for session:**

   ```bash
   docker exec -it auth-tutorial-redis redis-cli
   ```

   In Redis CLI:

   ```redis
   KEYS session:*
   GET session:abc123def456
   ```

   You should see the session stored!

## What's Next?

Now that sessions are stored, we need to:

1. Validate sessions on protected routes
2. Implement logout to revoke sessions

**Next Step**: [STEP-04-logout-revocation.md](./STEP-04-logout-revocation.md)

---

## Quick Summary

✅ **Created**: `SessionService` for managing sessions
✅ **Updated**: `AuthJwtService` to include token ID (`jti`)
✅ **Updated**: `UsersService` to create sessions on login
✅ **Created**: `SessionValidatorService` for validation

**Key Files:**

- `src/auth/services/session/session.service.ts`
- `src/auth/services/session/session-validator.service.ts`
- Updated `src/auth/services/jwt/jwt.service.ts`
- Updated `src/user/users.service.ts`
