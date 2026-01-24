# Step 05: Protected Routes and User Extraction

**Goal**: Complete the authentication flow by protecting routes and extracting user information

## Prerequisites

- ✅ Completed Step 04
- ✅ Guards created
- ✅ Strategy working

## Step 1: Create User Decorator

Create `src/common/decorators/user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract user from request
 * Usage: @User() user
 * Returns: User object from request.user (set by JWT strategy)
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**What this does:**

- Extracts `request.user` automatically
- Makes code cleaner than `@Request() req` then `req.user`
- Reusable across all controllers

## Step 2: Create Public Decorator (Optional)

For routes that should be public even when controller has guard:

Create `src/common/decorators/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Update guard to respect public routes:**

Update `src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true; // Skip authentication for public routes
    }
    
    return super.canActivate(context);
  }
}
```

**Usage:**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard) // All routes protected by default
export class UserController {
  @Public() // ← This route is public
  @Get('public')
  getPublic() {
    return 'Anyone can access this';
  }

  @Get('profile') // ← This route requires authentication
  getProfile(@User() user) {
    return user;
  }
}
```

## Step 3: Update User Controller with Decorators

Update `src/user/users.controller.ts`:

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
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  // Public routes (no guard)
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

  // Protected routes (require authentication)
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@User() user) {
    // user is automatically extracted from token
    console.log('Authenticated user:', user);
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@User() user) {
    // Return current user's profile
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @User() user) {
    // user.userId available for authorization checks
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Body() updateUserDto: UpdateUserDto,
    @Param('id') id: string,
    @User() user,
  ) {
    // Ensure user can only update their own profile
    if (user.userId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(updateUserDto, id);
  }
}
```

**Don't forget to import:**

```typescript
import { ForbiddenException } from '@nestjs/common';
```

## Step 4: Create Profile Endpoint

Add a dedicated profile endpoint:

```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
getMe(@User() user) {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
```

**Usage:**

```bash
GET http://localhost:3000/users/me
Authorization: Bearer <token>
```

## Step 5: Test Complete Flow

**Test 1: Register a user (public)**

```bash
POST http://localhost:3000/users
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

**Expected:** 201 Created

**Test 2: Login (public)**

```bash
POST http://localhost:3000/users/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected:** 200 OK with `accessToken`

**Test 3: Get profile (protected - with token)**

```bash
GET http://localhost:3000/users/me
Authorization: Bearer <accessToken-from-login>
```

**Expected:** 200 OK with user data

**Test 4: Get profile (protected - without token)**

```bash
GET http://localhost:3000/users/me
```

**Expected:** 401 Unauthorized

**Test 5: Get all users (protected - with token)**

```bash
GET http://localhost:3000/users
Authorization: Bearer <accessToken>
```

**Expected:** 200 OK with user list

## Step 6: Understanding Request Flow

**Complete flow diagram:**

```
1. Client sends request with token
   GET /users/me
   Authorization: Bearer <token>
   ↓
2. Guard intercepts request
   JwtAuthGuard.canActivate()
   ↓
3. Guard calls Passport
   AuthGuard('jwt')
   ↓
4. Passport extracts token
   ExtractJwt.fromAuthHeaderAsBearerToken()
   ↓
5. Passport verifies token
   - Checks signature
   - Checks expiration
   ↓
6. Strategy.validate() called
   - Checks session in Redis
   - Returns user object
   ↓
7. User attached to request
   request.user = { userId, email, ... }
   ↓
8. Route handler executes
   getMe(@User() user)
   ↓
9. Response sent
   200 OK with user data
```

**If validation fails:**

```
Step 5 or 6 fails
   ↓
UnauthorizedException thrown
   ↓
401 Unauthorized response
   ↓
Route handler never executes
```

## Step 7: Error Responses

**Missing token:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Invalid token:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Expired token:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Session revoked:**

```json
{
  "statusCode": 401,
  "message": "Session expired or revoked"
}
```

## Step 8: Best Practices

**1. Protect routes by default:**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard) // All routes protected
export class UserController {
  @Public() // Explicitly mark public routes
  @Post('login')
  login() { ... }
}
```

**2. Use custom decorators:**

```typescript
// Good
@Get('profile')
getProfile(@User() user) { ... }

// Less clean
@Get('profile')
getProfile(@Request() req) {
  const user = req.user;
  ...
}
```

**3. Validate user permissions:**

```typescript
@Patch(':id')
update(@Param('id') id: string, @User() user) {
  if (user.userId !== id) {
    throw new ForbiddenException();
  }
  // Update logic
}
```

## Step 9: Common Issues

**Issue 1: "Cannot read property 'user' of undefined"**

**Solution:** Ensure guard is applied:
```typescript
@UseGuards(JwtAuthGuard) // ← Must be present
@Get('profile')
getProfile(@User() user) { ... }
```

**Issue 2: "401 Unauthorized" even with valid token**

**Solutions:**
- Check token format: `Authorization: Bearer <token>`
- Verify JWT_SECRET matches
- Check session exists in Redis
- Verify token hasn't expired

**Issue 3: "Strategy not found"**

**Solution:** Ensure strategy is in AuthModule providers:
```typescript
providers: [JwtStrategy, ...]
```

## Step 10: Summary

**What we built:**

1. ✅ **JWT Strategy** - Validates tokens and sessions
2. ✅ **JWT Guard** - Protects routes automatically
3. ✅ **User Decorator** - Extracts user cleanly
4. ✅ **Protected Routes** - Require authentication
5. ✅ **Public Routes** - Explicitly marked

**Complete authentication flow:**

```
Login → Token → Guard → Strategy → Session Check → User → Route Handler
```

## Key Takeaways

1. ✅ **Guards protect routes** automatically
2. ✅ **@User() decorator** extracts user cleanly
3. ✅ **@Public() decorator** marks public routes
4. ✅ **Request flow** is: Guard → Strategy → Handler
5. ✅ **Error handling** returns 401 for invalid tokens

## What's Next?

You've completed the authentication flow! Next steps:

- **Lesson 06**: Authorization and role-based access control
- **Lesson 07**: Advanced features (password reset, email verification)
- **Lesson 08**: Production-ready features

---

**Congratulations!** You've successfully implemented:
- ✅ JWT token generation
- ✅ Session management with Redis
- ✅ Passport.js JWT strategy
- ✅ Authentication guards
- ✅ Protected routes
- ✅ User extraction

**Ready for the next lesson?** Move to [Lesson 06: Authorization and Guards](../06-authorization-and-guards/README.md)!
