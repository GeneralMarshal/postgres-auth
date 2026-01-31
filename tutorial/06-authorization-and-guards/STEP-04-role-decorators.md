# Step 04: Role Decorators

**Goal**: Create advanced decorators for roles and permissions

## Prerequisites

- ✅ Completed Step 03
- ✅ Roles guard working
- ✅ Routes protected with roles
- ✅ Understanding of decorators

## What Are Decorators?

**Decorators** are a TypeScript feature that allows you to add metadata to classes, methods, or properties. In NestJS, decorators are used extensively for:

- ✅ Route definitions (`@Get()`, `@Post()`)
- ✅ Dependency injection (`@Injectable()`)
- ✅ Guards (`@UseGuards()`)
- ✅ Metadata (`@SetMetadata()`)

**Why Custom Decorators?**

- ✅ Cleaner code
- ✅ Reusable logic
- ✅ Better readability
- ✅ Type safety

## Step 1: Review Existing Decorators

You already have:

- `@User()` - Extracts authenticated user
- `@Public()` - Marks routes as public
- `@Roles()` - Marks routes with required roles

Let's enhance these and create new ones!

## Step 2: Enhance Roles Decorator

Update `src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @param roles - One or more roles (OR logic: user needs ANY of these roles)
 * @example
 * @Roles('admin')
 * @Roles('admin', 'moderator')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Usage examples:**

```typescript
@Roles('admin')                    // Single role
@Roles('admin', 'moderator')       // Multiple roles (OR)
@Roles('user', 'admin', 'manager') // Any of these roles
```

## Step 3: Create RequireAllRoles Decorator

Sometimes you need AND logic (user must have ALL roles). Create `src/common/decorators/require-all-roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ALL_ROLES_KEY = 'requireAllRoles';

/**
 * Decorator to specify roles that ALL must be present (AND logic)
 * Note: This is rarely used, but useful for complex permission systems
 * @param roles - All roles must be present
 * @example
 * @RequireAllRoles('admin', 'superuser')
 */
export const RequireAllRoles = (...roles: string[]) =>
  SetMetadata(REQUIRE_ALL_ROLES_KEY, roles);
```

**Usage:**

```typescript
@RequireAllRoles('admin', 'superuser')  // Must be admin AND superuser
```

**Note:** This requires a custom guard implementation. For most cases, `@Roles()` with OR logic is sufficient.

## Step 4: Create HasRole Decorator (Method Decorator)

Create a decorator that can be used in service methods. Create `src/common/decorators/has-role.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const HAS_ROLE_KEY = 'hasRole';

/**
 * Decorator to check if user has a specific role
 * Used in service methods or route handlers
 * @param role - Required role
 */
export const HasRole = (role: string) => SetMetadata(HAS_ROLE_KEY, role);
```

**Usage in service:**

```typescript
@HasRole('admin')
async deleteUser(id: string) {
  // Method requires admin role
}
```

## Step 5: Create RequirePermissions Decorator

For more granular permissions, create `src/common/decorators/require-permissions.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions
 * @param permissions - One or more permissions (OR logic)
 * @example
 * @RequirePermissions('users:delete')
 * @RequirePermissions('users:delete', 'users:update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

**Permission format:** `resource:action`

- `users:delete` - Delete users
- `users:update` - Update users
- `posts:create` - Create posts
- `admin:access` - Access admin panel

**Usage:**

```typescript
@RequirePermissions('users:delete')
@Delete(':id')
deleteUser(@Param('id') id: string) {
  return this.usersService.delete(id);
}
```

## Step 6: Create CurrentUser Decorator (Enhanced)

Enhance the `@User()` decorator to optionally extract specific fields. Update `src/common/decorators/user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  tokenId?: string;
}

/**
 * Decorator to extract authenticated user from request
 * @param data - Optional field name to extract (e.g., 'role', 'userId')
 * @example
 * @User() user - Get full user object
 * @User('role') role - Get only role
 * @User('userId') userId - Get only userId
 */
export const User = createParamDecorator<
  unknown,
  ExecutionContext,
  AuthenticatedUser
>((data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as AuthenticatedUser;

  // If specific field requested, return that field
  if (data && typeof data === 'string') {
    return user?.[data as keyof AuthenticatedUser];
  }

  return user;
});
```

**Usage:**

```typescript
@Get('profile')
getProfile(@User() user: AuthenticatedUser) {
  // Full user object
  return user;
}

@Get('role')
getRole(@User('role') role: string) {
  // Only role
  return { role };
}

@Get('id')
getId(@User('userId') userId: string) {
  // Only userId
  return { userId };
}
```

## Step 7: Create IsOwner Decorator

Create a decorator to check resource ownership. Create `src/common/decorators/is-owner.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_OWNER_KEY = 'isOwner';
export const OWNER_FIELD_KEY = 'ownerField';

/**
 * Decorator to mark a route that requires resource ownership
 * User must own the resource (or be admin)
 * @param ownerField - Field name in resource that contains owner ID (default: 'userId')
 * @example
 * @IsOwner('userId')
 * @Get(':id')
 * getResource(@Param('id') id: string) { ... }
 */
export const IsOwner = (ownerField: string = 'userId') =>
  SetMetadata(IS_OWNER_KEY, { ownerField });
```

**Note:** This requires a custom guard implementation. See Step 8.

## Step 8: Create OwnerGuard

Create a guard that checks resource ownership. Create `src/auth/guards/owner.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_OWNER_KEY } from 'src/common/decorators/is-owner.decorator';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownerConfig = this.reflector.getAllAndOverride<{
      ownerField: string;
    }>(IS_OWNER_KEY, [context.getHandler(), context.getClass()]);

    // If not marked with @IsOwner, allow access
    if (!ownerConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admins can access anything
    if (user?.role === 'admin') {
      return true;
    }

    // Get resource ID from route params
    const resourceId = request.params.id;
    if (!resourceId) {
      return false;
    }

    // Fetch resource from database
    const resource = await this.prismaService.user.findUnique({
      where: { id: resourceId },
      select: { id: true, [ownerConfig.ownerField]: true },
    });

    if (!resource) {
      return false;
    }

    // Check if user owns the resource
    const ownerId = resource[ownerConfig.ownerField];
    if (user.userId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
```

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, OwnerGuard)
@IsOwner('userId')
@Get(':id')
getProfile(@Param('id') id: string) {
  // Only owner or admin can access
}
```

## Step 9: Create Role Helper Functions

Create `src/common/utils/role.utils.ts`:

```typescript
/**
 * Check if user has any of the required roles
 * @param userRole - User's role
 * @param requiredRoles - Required roles (OR logic)
 */
export function hasAnyRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user has all required roles
 * @param userRoles - User's roles (array)
 * @param requiredRoles - Required roles (AND logic)
 */
export function hasAllRoles(
  userRoles: string[],
  requiredRoles: string[],
): boolean {
  return requiredRoles.every((role) => userRoles.includes(role));
}

/**
 * Check if user is admin
 */
export function isAdmin(role: string): boolean {
  return role === 'admin';
}

/**
 * Check if user is admin or moderator
 */
export function isAdminOrModerator(role: string): boolean {
  return role === 'admin' || role === 'moderator';
}
```

**Usage in services:**

```typescript
import { hasAnyRole, isAdmin } from 'src/common/utils/role.utils';

async deleteUser(id: string, currentUser: AuthenticatedUser) {
  if (!isAdmin(currentUser.role)) {
    throw new ForbiddenException('Only admins can delete users');
  }
  // Delete logic
}
```

## Step 10: Create Role Constants

Create `src/common/constants/roles.ts`:

```typescript
/**
 * User roles constants
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MANAGER = 'manager',
}

/**
 * Metadata key for roles decorator
 */
export const ROLES_KEY = 'roles';

/**
 * All available roles
 */
export const ALL_ROLES = Object.values(UserRole);

/**
 * Admin-only roles
 */
export const ADMIN_ROLES = [UserRole.ADMIN];

/**
 * Moderator and above roles
 */
export const MODERATOR_ROLES = [UserRole.ADMIN, UserRole.MODERATOR];
```

**Usage:**

```typescript
import { UserRole, ADMIN_ROLES } from 'src/common/constants/roles';

@Roles(...ADMIN_ROLES)  // Type-safe!
@Delete(':id')
deleteUser() { ... }
```

## Step 11: Update Roles Decorator to Use Constants

Update `src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from 'src/common/constants/roles';

/**
 * Decorator to specify required roles for a route
 * @param roles - One or more roles (OR logic)
 * @example
 * @Roles('admin')
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

## Step 12: Usage Examples

**Example 1: Admin-only route**

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles('admin')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

**Example 2: Multiple roles**

```typescript
@Get('moderate')
@Roles('admin', 'moderator')
moderateContent() {
  return { message: 'Moderation panel' };
}
```

**Example 3: Resource ownership**

```typescript
@UseGuards(JwtAuthGuard, OwnerGuard)
@IsOwner('userId')
@Patch(':id')
updateProfile(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  // Only owner or admin can update
}
```

**Example 4: Extract specific user field**

```typescript
@Get('my-role')
getMyRole(@User('role') role: string) {
  return { role };
}
```

## Summary

**What we created:**

1. ✅ Enhanced `@Roles()` decorator
2. ✅ `@RequireAllRoles()` decorator (AND logic)
3. ✅ `@RequirePermissions()` decorator
4. ✅ Enhanced `@User()` decorator with field extraction
5. ✅ `@IsOwner()` decorator
6. ✅ `OwnerGuard` for resource ownership
7. ✅ Role utility functions
8. ✅ Role constants

**Benefits:**

- ✅ Cleaner, more readable code
- ✅ Type-safe role checking
- ✅ Reusable decorators
- ✅ Flexible permission system

**Next step:**
Let's implement permission checking and protect routes!

---

**Ready?** Move to [STEP-05-permission-checking.md](./STEP-05-permission-checking.md)!
