# Step 01: Authentication vs Authorization

**Goal**: Understand the fundamental difference between authentication and authorization

## Prerequisites

- ✅ Completed Lesson 05
- ✅ Authentication guards working
- ✅ Protected routes functioning

## What is Authentication?

**Authentication (AuthN)** answers the question: **"Who are you?"**

Authentication verifies that a user is who they claim to be. It's about **identity verification**.

**Examples:**

- ✅ Login with email and password
- ✅ Verifying JWT token signature
- ✅ Checking if session exists in Redis
- ✅ Extracting user from token payload

**Authentication Flow:**

```
1. User provides credentials → Email + Password
2. Server verifies credentials → Check database
3. Server generates token → JWT token
4. Client sends token → Authorization header
5. Server validates token → Signature + Expiration + Session
6. Server extracts user → From token payload
```

**In your code:**

```typescript
// Authentication guard checks: "Is this a valid token?"
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@User() user) {
  // User is authenticated - we know WHO they are
  return user;
}
```

## What is Authorization?

**Authorization (AuthZ)** answers the question: **"What can you do?"**

Authorization determines what an authenticated user is allowed to do. It's about **permission verification**.

**Examples:**

- ✅ Checking if user is an admin
- ✅ Verifying user has permission to delete
- ✅ Restricting access to certain routes based on role
- ✅ Checking if user owns the resource

**Authorization Flow:**

```
1. User is authenticated → We know WHO they are
2. Check user's role/permissions → Admin? User? Moderator?
3. Check if role has access → Does admin role allow this?
4. Allow or deny request → 200 OK or 403 Forbidden
```

**In your code (what you'll build):**

```typescript
// Authorization guard checks: "Does this user have permission?"
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  // User is authenticated AND authorized (import UserRole from '@prisma/client')
  return this.usersService.delete(id);
}
```

## Key Differences

| Aspect       | Authentication (AuthN)  | Authorization (AuthZ)        |
| ------------ | ----------------------- | ---------------------------- |
| **Question** | "Who are you?"          | "What can you do?"           |
| **Purpose**  | Verify identity         | Verify permissions           |
| **When**     | Before authorization    | After authentication         |
| **Failure**  | 401 Unauthorized        | 403 Forbidden                |
| **Example**  | Login, token validation | Role check, permission check |

## The Relationship

**Authentication must happen FIRST, then authorization:**

```
Request → Authentication → Authorization → Route Handler
         ↓                ↓
    If fails → 401    If fails → 403
```

**Example Flow:**

```typescript
// Step 1: Authentication (JwtAuthGuard)
@UseGuards(JwtAuthGuard)  // ← Checks: "Is token valid?"
@UseGuards(RolesGuard)    // ← Checks: "Is user admin?"
@Roles(UserRole.ADMIN)    // ← Required role (enum)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  // Both checks passed!
}
```

## Real-World Examples

### Example 1: Social Media Platform

**Authentication:**

- ✅ User logs in → Verifies email/password
- ✅ Token generated → User is authenticated

**Authorization:**

- ✅ User can edit their own posts → Own resource
- ✅ User cannot edit others' posts → Not authorized
- ✅ Admin can delete any post → Admin role
- ✅ Moderator can hide posts → Moderator role

### Example 2: E-commerce Platform

**Authentication:**

- ✅ Customer logs in → Verifies credentials
- ✅ Token validated → Customer is authenticated

**Authorization:**

- ✅ Customer can view products → Public or authenticated
- ✅ Customer can place orders → Authenticated user
- ✅ Customer cannot access admin panel → Not admin
- ✅ Admin can manage products → Admin role
- ✅ Admin can view all orders → Admin permission

## Current State of Your Application

**What you have (Authentication):**

```typescript
// ✅ Authentication working
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@User() user) {
  // Any authenticated user can access
  return user;
}
```

**What's missing (Authorization):**

```typescript
// ❌ No role checking
@UseGuards(JwtAuthGuard)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  // ANY authenticated user can delete ANY user!
  // This is a security issue! (Lesson 06 adds @Roles(UserRole.ADMIN))
  return this.usersService.delete(id);
}
```

**Problem:**

- ✅ Users can authenticate
- ❌ All users have the same permissions
- ❌ No way to restrict actions to admins
- ❌ No way to check user roles

## What You'll Build

In this lesson, you'll implement:

1. **Roles in User Model** - Add `UserRole` enum and `role` field (Prisma)
2. **Role Guards** - Guards that check user roles
3. **Role Decorators** - Easy way to mark routes with required roles
4. **Permission Checking** - Logic to verify user permissions

**After this lesson:**

```typescript
// ✅ Authentication + Authorization
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  // Only admins can delete users
  return this.usersService.delete(id);
}
```

## Common Patterns

### Pattern 1: Role-Based Access Control (RBAC)

**Roles:** Use the `UserRole` enum from Prisma (USER, ADMIN, MODERATOR, MANAGER).

```typescript
import { UserRole } from '@prisma/client';

@Roles(UserRole.ADMIN)  // Only admins
@Delete(':id')
deleteUser() { ... }

@Roles(UserRole.ADMIN, UserRole.MODERATOR)  // Admins OR moderators
@Patch(':id')
updateUser() { ... }
```

### Pattern 2: Permission-Based Access Control

**Permissions:** `users:delete`, `users:update`, etc.

```typescript
@RequirePermissions('users:delete')
@Delete(':id')
deleteUser() { ... }
```

### Pattern 3: Resource Ownership

**Check if user owns the resource:**

```typescript
@Get(':id')
getProfile(@Param('id') id: string, @User() user) {
  if (user.userId !== id && user.role !== UserRole.ADMIN) {
    throw new ForbiddenException();
  }
  return this.usersService.findById(id);
}
```

## Guard Execution Order

**Important:** Guards execute in order:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
deleteUser() { ... }
```

**Execution:**

1. `JwtAuthGuard` runs first → Checks authentication
2. If authentication fails → Returns 401, stops execution
3. If authentication succeeds → `RolesGuard` runs
4. `RolesGuard` checks role → Checks if user has required role (e.g. UserRole.ADMIN)
5. If role check fails → Returns 403, stops execution
6. If role check succeeds → Route handler executes

**Why order matters:**

- Authentication must happen before authorization
- If user isn't authenticated, no point checking roles
- Guards execute left to right

## Error Responses

**Authentication Failure (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Authorization Failure (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Key Difference:**

- **401**: "You need to log in" (not authenticated)
- **403**: "You're logged in, but you don't have permission" (not authorized)

## Summary

**Authentication (AuthN):**

- ✅ Verifies identity
- ✅ Answers "Who are you?"
- ✅ Happens first
- ✅ Returns 401 if fails

**Authorization (AuthZ):**

- ✅ Verifies permissions
- ✅ Answers "What can you do?"
- ✅ Happens after authentication
- ✅ Returns 403 if fails

**Next Step:**
Now that you understand the difference, let's add roles to your User model and implement role-based access control!

---

**Ready?** Move to [STEP-02-roles-setup.md](./STEP-02-roles-setup.md)!
