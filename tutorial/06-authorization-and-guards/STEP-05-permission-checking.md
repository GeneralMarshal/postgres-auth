# Step 05: Permission Checking

**Goal**: Implement comprehensive permission checking and protect routes

## Prerequisites

- ✅ Completed Step 04
- ✅ Role decorators created
- ✅ Role guards working
- ✅ Understanding of authorization flow

## What is Permission Checking?

**Permission checking** is the process of verifying that a user has the right to perform a specific action. It goes beyond role checking to include:

- ✅ Resource ownership
- ✅ Context-based permissions
- ✅ Dynamic permission evaluation
- ✅ Fine-grained access control

## Step 1: Create Permission Service

Create `src/auth/services/permission.service.ts`:

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from 'src/common/decorators/user.decorator';

@Injectable()
export class PermissionService {
  /**
   * Check if user has required role
   */
  hasRole(user: AuthenticatedUser, requiredRoles: UserRole[]): boolean {
    if (!user?.role) {
      return false;
    }
    return requiredRoles.includes(user.role);
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: AuthenticatedUser): boolean {
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Check if user owns the resource
   */
  isOwner(user: AuthenticatedUser, resourceOwnerId: string): boolean {
    return user?.userId === resourceOwnerId;
  }

  /**
   * Check if user can access resource (owner or admin)
   */
  canAccess(user: AuthenticatedUser, resourceOwnerId: string): boolean {
    return this.isAdmin(user) || this.isOwner(user, resourceOwnerId);
  }

  /**
   * Throw ForbiddenException if user doesn't have role
   */
  requireRole(user: AuthenticatedUser, requiredRoles: UserRole[]): void {
    if (!this.hasRole(user, requiredRoles)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }
  }

  /**
   * Throw ForbiddenException if user is not admin
   */
  requireAdmin(user: AuthenticatedUser): void {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }
  }

  /**
   * Throw ForbiddenException if user doesn't own resource
   */
  requireOwnership(user: AuthenticatedUser, resourceOwnerId: string): void {
    if (!this.canAccess(user, resourceOwnerId)) {
      throw new ForbiddenException(
        'Access denied. You do not have permission to access this resource.',
      );
    }
  }
}
```

## Step 2: Register Permission Service

Update `src/auth/auth.module.ts`:

```typescript
import { PermissionService } from './services/permission.service';

@Module({
  // ... existing code
  providers: [
    // ... existing providers
    PermissionService,
  ],
  exports: [PermissionService],
})
export class AuthModule {}
```

## Step 3: Update User Service with Permission Checks

Update `src/user/users.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { PasswordService } from 'src/common/services/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthJwtService } from 'src/auth/services/jwt/jwt.service';
import { SessionService } from 'src/auth/services/session/session.service';
import { PermissionService } from 'src/auth/services/permission.service';
import { AuthenticatedUser } from 'src/common/decorators/user.decorator';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private jwtService: AuthJwtService,
    private sessionService: SessionService,
    private permissionService: PermissionService, // ← Inject
  ) {}

  // ... existing methods

  async findById(
    id: string,
    currentUser?: AuthenticatedUser,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    // If currentUser provided, check permissions
    if (currentUser) {
      // Users can view their own profile, admins can view any
      if (!this.permissionService.canAccess(currentUser, user.id)) {
        throw new ForbiddenException('Access denied');
      }
    }

    return user;
  }

  async update(
    updateUserDto: UpdateUserDto,
    id: string,
    currentUser: AuthenticatedUser,
  ) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    // Check permissions: owner or admin
    this.permissionService.requireOwnership(currentUser, user.id);

    // If updating email, check uniqueness
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExist = await this.findByEmail(updateUserDto.email);
      if (emailExist) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // If updating role, require admin (only admins can change roles)
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      this.permissionService.requireAdmin(currentUser);
    }

    const updateData: Partial<UpdateUserDto> = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await this.passwordService.hashPassword(
        updateUserDto.password,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async delete(id: string, currentUser: AuthenticatedUser) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} does not exist`);
    }

    // Only admins can delete users
    this.permissionService.requireAdmin(currentUser);

    // Prevent self-deletion (optional)
    if (currentUser.userId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
```

## Step 4: Update User Controller

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
  ForbiddenException,
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
@UseGuards(JwtAuthGuard) // All routes require authentication
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@User() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @User() user: AuthenticatedUser) {
    // Permission check happens in service
    return this.usersService.findById(id, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: AuthenticatedUser,
  ) {
    // Permission check happens in service
    return this.usersService.update(updateUserDto, id, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string, @User() user: AuthenticatedUser) {
    // Permission check happens in service
    return this.usersService.delete(id, user);
  }
}
```

## Step 5: Create Resource-Based Permission Guard

Create `src/auth/guards/resource-permission.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from 'src/common/decorators/require-permissions.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class ResourcePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check permissions (simplified - in real app, check user's permissions)
    // For now, map permissions to roles (use UserRole enum)
    const permissionToRoleMap: Record<string, UserRole[]> = {
      'users:delete': [UserRole.ADMIN],
      'users:update': [UserRole.ADMIN],
      'users:read': [UserRole.ADMIN, UserRole.MODERATOR],
      'admin:access': [UserRole.ADMIN],
    };

    const userRole = user.role ?? UserRole.USER;
    const hasPermission = requiredPermissions.some((permission) => {
      const allowedRoles = permissionToRoleMap[permission] || [];
      return allowedRoles.includes(userRole);
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
```

## Step 6: Implement Context-Based Permissions

Create `src/auth/services/context-permission.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from 'src/common/decorators/user.decorator';

@Injectable()
export class ContextPermissionService {
  /**
   * Check if user can perform action in specific context
   */
  canPerformAction(
    user: AuthenticatedUser,
    action: string,
    context: Record<string, any>,
  ): boolean {
    // Admin can do anything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Context-specific checks
    switch (action) {
      case 'update':
        // User can update their own resources
        return user.userId === context.resourceOwnerId;

      case 'delete':
        // Only admin can delete
        return user.role === UserRole.ADMIN;

      case 'read':
        // User can read their own resources or public resources
        return (
          user.userId === context.resourceOwnerId || context.isPublic === true
        );

      default:
        return false;
    }
  }

  /**
   * Check if user can access resource based on time
   */
  canAccessDuringHours(user: AuthenticatedUser, currentHour: number): boolean {
    // Admin can access anytime
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Regular users can access 9 AM - 5 PM
    return currentHour >= 9 && currentHour < 17;
  }

  /**
   * Check if user can access based on resource status
   */
  canAccessResource(user: AuthenticatedUser, resourceStatus: string): boolean {
    // Admin can access any resource
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Users can only access active resources
    return resourceStatus === 'active';
  }
}
```

## Step 7: Protect Routes with Permissions

**Example: Admin Controller**

Create `src/admin/admin.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResourcePermissionGuard } from 'src/auth/guards/resource-permission.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, ResourcePermissionGuard)
export class AdminController {
  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @RequirePermissions('admin:access')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  @Get('users')
  @Roles(UserRole.ADMIN)
  @RequirePermissions('users:read')
  getAllUsers() {
    return { message: 'All users' };
  }
}
```

## Step 8: Test Permission Checking

**Test 1: Admin can access admin routes**

```bash
# Login as admin
POST /users/login
{
  "email": "admin@example.com",
  "password": "password123"
}

# Access admin dashboard
GET /admin/dashboard
Authorization: Bearer <admin-token>

# Expected: 200 OK
```

**Test 2: Regular user cannot access admin routes**

```bash
# Login as regular user
POST /users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Try to access admin dashboard
GET /admin/dashboard
Authorization: Bearer <user-token>

# Expected: 403 Forbidden
```

**Test 3: User can update own profile**

```bash
# Login as user
POST /users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Update own profile
PATCH /users/<user-id>
Authorization: Bearer <user-token>
{
  "name": "Updated Name"
}

# Expected: 200 OK
```

**Test 4: User cannot update other user's profile**

```bash
# Login as user
POST /users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Try to update another user's profile
PATCH /users/<other-user-id>
Authorization: Bearer <user-token>
{
  "name": "Hacked Name"
}

# Expected: 403 Forbidden
```

## Step 9: Best Practices

### 1. Defense in Depth

Check permissions at multiple levels:

```typescript
// Guard level
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)

// Service level
async deleteUser(id: string, currentUser: AuthenticatedUser) {
  this.permissionService.requireAdmin(currentUser);
  // Delete logic
}
```

### 2. Fail Securely

When in doubt, deny access:

```typescript
if (!hasPermission) {
  throw new ForbiddenException(); // Deny by default
}
```

### 3. Log Authorization Failures

```typescript
if (!hasPermission) {
  this.logger.warn(`User ${user.userId} attempted unauthorized action`);
  throw new ForbiddenException();
}
```

### 4. Use Enum for Roles

```typescript
import { UserRole } from '@prisma/client';

@Roles(UserRole.ADMIN)  // Type-safe (enum)
```

### 5. Document Permission Requirements

```typescript
/**
 * Delete a user
 * @requires Admin role
 * @permission users:delete
 */
@Delete(':id')
@Roles(UserRole.ADMIN)
deleteUser() { ... }
```

## Step 10: Summary

**What we implemented:**

1. ✅ `PermissionService` - Centralized permission checking
2. ✅ Service-level permission checks
3. ✅ Resource ownership validation
4. ✅ Context-based permissions
5. ✅ Protected routes with multiple guards
6. ✅ Comprehensive permission system

**Authorization Flow:**

```
Request → JwtAuthGuard → RolesGuard → PermissionService → Route Handler
         ↓              ↓             ↓
    401 if fails   403 if fails   403 if fails
```

**Current State:**

- ✅ Routes protected with roles
- ✅ Permission checking in services
- ✅ Resource ownership validation
- ✅ Admin-only routes
- ✅ User-specific resource access

## Key Takeaways

1. ✅ **Authentication** verifies identity (401)
2. ✅ **Authorization** verifies permissions (403)
3. ✅ **Guards** protect routes automatically
4. ✅ **Services** validate permissions
5. ✅ **Defense in depth** - check at multiple levels

## What's Next?

Congratulations! You've completed Lesson 06: Authorization and Guards. You now have:

- ✅ Role-based access control
- ✅ Custom guards and decorators
- ✅ Permission checking
- ✅ Resource ownership validation

**Next Lesson:** Lesson 07: Advanced Features

- Multi-factor authentication (MFA)
- Password reset flow
- Email verification
- Security best practices

---

**Congratulations on completing Lesson 06!** 🎉
