# Lesson 06: Authorization and Guards

**Goal**: Understand role-based access control, implement authorization guards, and create custom decorators for permissions

## What You'll Learn

By the end of this lesson, you will:

- ✅ Understand authentication vs authorization
- ✅ Implement role-based access control (RBAC)
- ✅ Add roles to User model
- ✅ Create role-based guards
- ✅ Create custom role decorators
- ✅ Understand guard execution order
- ✅ Implement permission checking
- ✅ Protect routes based on user roles

## Prerequisites

- ✅ Completed Lesson 05
- ✅ Authentication flow working
- ✅ JWT guards protecting routes
- ✅ User decorator extracting authenticated user

## Lesson Structure

This lesson is broken into 5 steps:

1. **STEP-01-authentication-vs-authorization.md** - Understand the difference between authentication and authorization
2. **STEP-02-roles-setup.md** - Add roles to User model and update database schema
3. **STEP-03-role-guards.md** - Create role-based authorization guards
4. **STEP-04-role-decorators.md** - Create custom decorators for roles
5. **STEP-05-permission-checking.md** - Implement permission checking and protect routes

## Getting Started

1. Start with **STEP-01-authentication-vs-authorization.md**
2. Follow each step in order
3. Build along with the code examples
4. Test everything as you go

## Time Estimate

- **STEP 01**: 25 minutes (reading concepts)
- **STEP 02**: 30 minutes
- **STEP 03**: 40 minutes
- **STEP 04**: 30 minutes
- **STEP 05**: 35 minutes

**Total**: ~160 minutes

## Key Concepts

- Authentication vs Authorization
- Role-Based Access Control (RBAC)
- Guard execution order
- Custom decorators
- Permission checking
- Route protection based on roles

## Why This Matters

In Lesson 05, you learned how to **authenticate** users - verifying they are who they claim to be. But authentication alone isn't enough! You also need **authorization** - determining what authenticated users are allowed to do.

**Current Problem:**

- ✅ Users can authenticate (login)
- ✅ Routes are protected (require authentication)
- ❌ But ALL authenticated users have the SAME access level
- ❌ No way to restrict certain actions to admins only
- ❌ No way to check user permissions

**What You'll Build:**

- ✅ Role-based access control (Admin, User, etc.)
- ✅ Guards that check user roles
- ✅ Decorators to easily mark routes with required roles
- ✅ Permission checking logic
- ✅ Protected admin-only routes

## Next Steps

After completing this lesson, you'll move to **Lesson 07: Advanced Features** where you'll learn about multi-factor authentication, password reset, and email verification.

---

**Ready?** Start with [STEP-01-authentication-vs-authorization.md](./STEP-01-authentication-vs-authorization.md)!
