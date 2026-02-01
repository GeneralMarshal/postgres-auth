# Step 03: Role Guards

**Goal**: Create role-based authorization guards to protect routes based on user roles

## Prerequisites

- ✅ Completed Step 02
- ✅ User model has `role` field
- ✅ Roles stored in database
- ✅ Understanding of guards from Lesson 05

## What is a Role Guard?

A **role guard** is a guard that checks if an authenticated user has the required role(s) to access a route.

**Guard Flow:**

```
1. User is authenticated (JwtAuthGuard passed)
2. Extract user from request
3. Check user's role
4. Compare with required roles
5. Allow or deny access
```

## Step 1: Create Roles Decorator

First, create a decorator to mark routes with required roles. Create `src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**Breaking it down:**

- `SetMetadata` - Stores metadata on route handlers
- `ROLES_KEY` - Key to store roles metadata
- `Roles(...roles)` - Decorator that accepts one or more `UserRole` enum values
- Returns a decorator function

**Usage:**

```typescript
import { UserRole } from '@prisma/client';

@Roles(UserRole.ADMIN)                        // Single role
@Roles(UserRole.ADMIN, UserRole.MODERATOR)    // Multiple roles (OR logic)
```

## Step 2: Create Roles Guard

Create `src/auth/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Extract user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, deny access (shouldn't happen if JwtAuthGuard is applied)
    if (!user) {
      return false;
    }

    // Check if user's role matches any required role (enum comparison)
    return requiredRoles.some((role) => user.role === role);
  }
}
```

**Breaking it down:**

- `Reflector` - Reads metadata from route handlers
- `getAllAndOverride` - Gets roles from `@Roles()` decorator
- `context.getHandler()` - Route handler method
- `context.getClass()` - Controller class
- `request.user` - User attached by JwtAuthGuard
- `some()` - Returns true if user's role matches ANY required role (OR logic)

**Logic:**

- If no roles required → Allow access
- If user not authenticated → Deny access
- If user's role matches any required role → Allow access
- Otherwise → Deny access

## Step 3: Update JWT Strategy to Include Role

Ensure the JWT strategy includes role in the user object. Update `src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../services/jwt/jwt.service';
import { SessionValidatorService } from '../services/session/session-validator.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private sessionValidatorService: SessionValidatorService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    // Validate session exists
    const sessionExists = await this.sessionValidatorService.validateSession(
      payload.jti,
    );

    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Return user object (attached to request.user)
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role ?? UserRole.USER, // ← Include role, default to USER (enum)
      tokenId: payload.jti,
    };
  }
}
```

**Note:** If you didn't include role in JWT payload (from Step 02), you can fetch it from the database:

```typescript
async validate(payload: JwtPayload) {
  const sessionExists = await this.sessionValidatorService.validateSession(
    payload.jti,
  );

  if (!sessionExists) {
    throw new UnauthorizedException('Session expired or invalid');
  }

  // Fetch user from database to get role
  const user = await this.prismaService.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenId: payload.jti,
  };
}
```

**Trade-off:**

- ✅ Always up-to-date role
- ❌ Database lookup on every request

## Step 4: Update AuthenticatedUser Interface

Update `src/common/decorators/user.decorator.ts` to include role (use Prisma enum):

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role?: UserRole; // ← Add role (enum)
  tokenId?: string;
}

export const User = createParamDecorator<
  unknown,
  ExecutionContext,
  AuthenticatedUser
>((data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthenticatedUser;
});
```

## Step 5: Register Roles Guard in AuthModule

Update `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from 'src/common/common.module';
import { AuthJwtService } from './services/jwt/jwt.service';
import { SessionService } from './services/session/session.service';
import { SessionValidatorService } from './services/session/session-validator.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard'; // ← Import

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '1h');
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    CommonModule,
  ],
  providers: [
    AuthJwtService,
    SessionService,
    SessionValidatorService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard, // ← Add to providers
  ],
  exports: [AuthJwtService, SessionService, JwtAuthGuard, RolesGuard], // ← Export
})
export class AuthModule {}
```

## Step 6: Using Roles Guard

**Basic usage:**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // ← Apply both guards
export class AdminController {
  @Get('dashboard')
  @Roles(UserRole.ADMIN) // ← Only admins can access
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

**Multiple roles (OR logic):**

```typescript
import { UserRole } from '@prisma/client';

@Get('moderate')
@Roles(UserRole.ADMIN, UserRole.MODERATOR)  // ← Admin OR moderator
moderateContent() {
  return { message: 'Moderation panel' };
}
```

**Guard execution order:**

1. `JwtAuthGuard` runs first → Checks authentication
2. If authenticated → `RolesGuard` runs
3. `RolesGuard` checks role → Compares user role with required roles
4. If role matches → Route handler executes

## Step 7: Protect User Routes

Update `src/user/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/decorators/user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard) // ← All routes require authentication
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@User() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Get()
  @UseGuards(RolesGuard) // ← Add RolesGuard
  @Roles(UserRole.ADMIN) // ← Only admins can list all users
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string, @User() user: AuthenticatedUser) {
    // Users can view their own profile, admins can view any
    if (user.userId !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: AuthenticatedUser,
  ) {
    // Users can update their own profile, admins can update any
    if (user.userId !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.update(updateUserDto, id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) // ← Add RolesGuard
  @Roles(UserRole.ADMIN) // ← Only admins can delete users
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
```

## Step 8: Test Role Guards

**1. Test admin-only route:**

```bash
# Login as regular user
POST /users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Try to access admin route (should fail)
GET /admin/dashboard
Authorization: Bearer <user-token>

# Expected: 403 Forbidden
```

**2. Test with admin user:**

```bash
# Login as admin (user with role ADMIN)
POST /users/login
{
  "email": "admin@example.com",
  "password": "password123"
}

# Access admin route (should succeed)
GET /admin/dashboard
Authorization: Bearer <admin-token>

# Expected: 200 OK with dashboard data
```

**3. Test multiple roles:**

```bash
# Login as user with MODERATOR role
POST /users/login
{
  "email": "moderator@example.com",
  "password": "password123"
}

# Access route that allows ADMIN OR MODERATOR
GET /admin/moderate
Authorization: Bearer <moderator-token>

# Expected: 200 OK
```

## Common Issues

**Issue 1: "RolesGuard: user is undefined"**

**Solution:** Ensure `JwtAuthGuard` is applied BEFORE `RolesGuard`:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)  // ← Correct order
```

**Issue 2: "403 Forbidden even with correct role"**

**Solutions:**

- Check role in JWT payload matches database (use enum: USER, ADMIN, MODERATOR, MANAGER)
- Verify `@Roles()` uses `UserRole` enum (e.g. `@Roles(UserRole.ADMIN)`)
- Ensure Prisma client is generated so `UserRole` is available from `@prisma/client`

**Issue 3: "RolesGuard not working"**

**Solution:** Ensure guard is registered in `AuthModule` providers and exported.

## Summary

**What we built:**

1. ✅ `Roles` decorator - Marks routes with required roles
2. ✅ `RolesGuard` - Checks user roles against required roles
3. ✅ Updated JWT strategy to include role
4. ✅ Protected routes with role-based access

**Current state:**

- ✅ Routes can require specific roles
- ✅ Guards check roles automatically
- ✅ Multiple roles supported (OR logic)
- ✅ 403 Forbidden for unauthorized access

**Next step:**
Let's create more advanced decorators and implement permission checking!

---

**Ready?** Move to [STEP-04-role-decorators.md](./STEP-04-role-decorators.md)!
