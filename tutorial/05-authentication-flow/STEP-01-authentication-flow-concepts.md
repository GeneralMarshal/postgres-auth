# Step 01: Authentication Flow Concepts

**Goal**: Understand how authentication works in web applications and the role of Passport.js

## What is Authentication Flow?

Authentication flow is the process of verifying that a user is who they claim to be. Here's the complete flow:

```
1. User logs in → Credentials verified
2. Server generates JWT token → Token sent to client
3. Client stores token → Usually in localStorage or cookies
4. Client sends token with requests → In Authorization header
5. Server validates token → Checks signature, expiration, session
6. Server extracts user info → From token payload
7. Request proceeds → With authenticated user context
```

## The Problem We're Solving

Right now, your endpoints are **public** - anyone can access them:

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);
}
```

**Problem**: Anyone can access any user's data!

**Solution**: Protect routes with authentication guards that:
- ✅ Verify the token is valid
- ✅ Check if session exists in Redis
- ✅ Extract user information
- ✅ Attach user to request object

## Understanding Guards

**What is a Guard?**

A guard is a class that determines whether a request should be handled by the route handler. Think of it as a **bouncer** at a club:

```typescript
// Without guard (public)
@Get('profile')
getProfile() {
  return 'Anyone can see this';
}

// With guard (protected)
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {
  return 'Only authenticated users can see this';
}
```

**Guard Execution Order:**

```
Request → Guards → Route Handler
         ↓
    If guard fails → 401 Unauthorized
```

## Passport.js Overview

**What is Passport.js?**

Passport.js is authentication middleware for Node.js. It provides a **strategy-based** approach to authentication.

**Why Use Passport.js?**

- ✅ Industry standard
- ✅ Supports many strategies (JWT, OAuth, Local, etc.)
- ✅ Clean separation of concerns
- ✅ Easy to test
- ✅ Well-maintained

**How Passport Works:**

```
1. Define a Strategy (e.g., JWT Strategy)
2. Strategy validates the token
3. Strategy returns user object
4. Guard uses strategy to protect routes
```

## Strategy Pattern

**What is a Strategy?**

A strategy is a way to authenticate. Passport has strategies for:
- **JWT**: Token-based authentication (what we'll use)
- **Local**: Username/password
- **OAuth**: Google, Facebook, etc.
- **Bearer**: Token in Authorization header

**JWT Strategy Flow:**

```
1. Extract token from Authorization header
2. Verify token signature
3. Check token expiration
4. Validate session in Redis
5. Return user payload
```

## Request Flow Through Guards

Here's what happens when a request hits a protected route:

```
1. Request arrives
   ↓
2. Guard intercepts request
   ↓
3. Guard extracts token from header
   ↓
4. Guard calls Strategy
   ↓
5. Strategy validates token
   ↓
6. Strategy checks session in Redis
   ↓
7. Strategy returns user payload
   ↓
8.es Guard attach user to request
   ↓
9. Route handler executes
   ↓
10. Response sent
```

**If validation fails at any step:**

```
Guard throws UnauthorizedException → 401 Response
```

## Authentication vs Authorization

**Authentication (AuthN):**
- "Who are you?"
- Verifies user identity
- Checks if user is logged in
- Example: Login, token validation

**Authorization (AuthZ):**
- "What can you do?"
- Verifies user permissions
- Checks if user has access
- Example: Admin-only routes, role-based access

**In this lesson:**
- We focus on **Authentication** (verifying identity)
- Authorization comes in Lesson 06

## Token Extraction

**Where is the token?**

The token is sent in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to extract it:**

```typescript
// In a guard or strategy
const authHeader = request.headers.authorization;
const token = authHeader?.split(' ')[1]; // Extract token after "Bearer "
```

## User Extraction

**After validation, we need the user:**

The JWT payload contains:
```json
{
  "sub": "user-id-123",
  "email": "user@example.com",
  "jti": "token-id-456",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**We extract `sub` (user ID) and attach it to the request:**

```typescript
// In strategy
return { userId: payload.sub, email: payload.email };

// In guard
request.user = { userId: '...', email: '...' };
```

## Complete Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. POST /users/login
       │    { email, password }
       │
       ▼
┌─────────────┐
│   Server    │
│  Controller │
└──────┬──────┘
       │
       │ 2. Verify credentials
       │
       ▼
┌─────────────┐
│   Service   │
│  (Login)    │
└──────┬──────┘
       │
       │ 3. Generate JWT
       │ 4. Create session in Redis
       │
       ▼
┌─────────────┐
│   Client    │
│  Stores     │
│   Token     │
└──────┬──────┘
       │
       │ 5. GET /users/profile
       │    Authorization: Bearer <token>
       │
       ▼
┌─────────────┐
│   Guard     │
│  Intercepts │
└──────┬──────┘
       │
       │ 6. Extract token
       │
       ▼
┌─────────────┐
│  Strategy   │
│  Validates  │
└──────┬──────┘
       │
       │ 7. Verify signature
       │ 8. Check expiration
       │ 9. Validate session
       │
       ▼
┌─────────────┐
│   Route     │
│  Handler    │
│  Executes   │
└─────────────┘
```

## Key Takeaways

1. **Guards** protect routes by validating requests
2. **Strategies** define how to authenticate (JWT, Local, etc.)
3. **Passport.js** provides a clean way to implement strategies
4. **Token extraction** happens from Authorization header
5. **User extraction** happens from JWT payload
6. **Session validation** ensures token hasn't been revoked

## What's Next?

In the next step, we'll:
- ✅ Install and configure Passport.js
- ✅ Set up the JWT strategy module
- ✅ Understand NestJS Passport integration

---

**Ready?** Move to [STEP-02-passport-setup.md](./STEP-02-passport-setup.md)!
