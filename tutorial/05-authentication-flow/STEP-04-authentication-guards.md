# Step 04: Authentication Guards

**Goal**: Create authentication guards to protect routes automatically

## Prerequisites

- ✅ Completed Step 03
- ✅ JWT strategy implemented
- ✅ Strategy registered in module

## What is a Guard?

A guard is a class that determines whether a request should be handled by the route handler.

**Guard Responsibilities:**

1. ✅ Extract token from request
2. ✅ Call strategy to validate token
3. ✅ Attach user to request
4. ✅ Allow or deny request

**Guard Execution:**

```
Request → Guard → Strategy → Route Handler
         ↓
    If fails → 401 Unauthorized
```

## Step 1: Create JWT Auth Guard

Create `src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**That's it!** NestJS Passport integration makes it this simple.

**Breaking it down:**

- `extends AuthGuard('jwt')`: Uses the 'jwt' strategy
- `'jwt'` matches the strategy name (defaults to class name without 'Strategy')
- `@Injectable()`: Makes it injectable

## Step 2: Understanding Guard Names

**How Passport matches guards to strategies:**

1. Guard calls `AuthGuard('jwt')`
2. Passport looks for strategy named 'jwt'
3. Strategy name comes from class: `JwtStrategy` → 'jwt'

**Custom strategy name:**

If you want a custom name:

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'custom-name') {
  // Now use: AuthGuard('custom-name')
}
```

**Default behavior:**

- `JwtStrategy` → 'jwt' (default)
- `LocalStrategy` → 'local' (default)

## Step 3: Using Guards on Routes

**Protect a single route:**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile() {
    return 'Protected route';
  }
}
```

**Protect multiple routes:**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard) // ← Protects all routes in controller
export class UserController {
  @Get('profile')
  getProfile() {
    return 'Protected';
  }

  @Get('settings')
  getSettings() {
    return 'Also protected';
  }
}
```

**Protect controller but exclude some routes:**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  // Protected
  @Get('profile')
  getProfile() {
    return 'Protected';
  }

  // Public (no guard)
  @Public() // ← Custom decorator (we'll create this)
  @Get('public')
  getPublic() {
    return 'Public';
  }
}
```

## Step 4: Extract User from Request

**After guard validates, user is in request:**

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    const user = req.user; // ← User from strategy validate()
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
    };
  }
}
```

**Using custom decorator (better approach):**

Create `src/common/decorators/user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Use it:**

```typescript
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@User() user) {
  return {
    userId: user.userId,
    email: user.email,
  };
}
```

**Much cleaner!**

## Step 5: Update User Controller

Let's protect the user routes. Update `src/user/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  HttpCode,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  // Public routes
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }

  // Protected routes
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    // req.user is available here
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    // req.user is available here
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Body() updateUserDto: UpdateUserDto,
    @Param('id') id: string,
    @Request() req,
  ) {
    // req.user is available here
    return this.usersService.update(updateUserDto, id);
  }
}
```

## Step 6: Export Guard from Auth Module

Update `src/auth/auth.module.ts`:

```typescript
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  // ... imports
  providers: [
    AuthJwtService,
    SessionService,
    JwtStrategy,
    JwtAuthGuard, // ← Add guard
  ],
  exports: [
    JwtModule,
    AuthJwtService,
    SessionService,
    PassportModule,
    JwtAuthGuard, // ← Export guard
  ],
})
export class AuthModule {}
```

## Step 7: Import Auth Module in User Module

Update `src/user/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, CommonModule, AuthModule], // ← AuthModule provides guard
  controllers: [UserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UserModule {}
```

## Step 8: Test Protected Routes

**Test without token (should fail):**

```bash
GET http://localhost:3000/users
# Expected: 401 Unauthorized
```

**Test with token (should succeed):**

```bash
# 1. Login first
POST http://localhost:3000/users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# 2. Copy accessToken from response

# 3. Use token in Authorization header
GET http://localhost:3000/users
Authorization: Bearer <your-token-here>
# Expected: 200 OK with user list
```

## Step 9: Understanding Guard Execution Order

**Multiple guards:**

```typescript
@UseGuards(Guard1, Guard2, Guard3)
@Get('route')
getRoute() {
  // Guards execute in order: Guard1 → Guard2 → Guard3
}
```

**If any guard fails:**

- Request stops
- 401 Unauthorized returned
- Route handler never executes

## Step 10: Custom Guard Logic (Advanced)

**If you need custom logic:**

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Custom logic before validation
    const request = context.switchToHttp().getRequest();
    
    // Example: Skip validation for certain paths
    if (request.path === '/health') {
      return true;
    }
    
    // Call parent validation
    return super.canActivate(context);
  }
}
```

**Usually not needed** - default behavior is sufficient.

## Key Takeaways

1. ✅ **Guards protect routes** by validating requests
2. ✅ **JwtAuthGuard** extends `AuthGuard('jwt')`
3. ✅ **@UseGuards()** decorator protects routes
4. ✅ **req.user** contains user from strategy
5. ✅ **Custom decorator** makes user extraction cleaner
6. ✅ **Guards execute** before route handlers

## What's Next?

In the next step, we'll:
- ✅ Create a user decorator
- ✅ Protect routes properly
- ✅ Test complete authentication flow

---

**Ready?** Move to [STEP-05-protected-routes.md](./STEP-05-protected-routes.md)!
