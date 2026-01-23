# STEP 01: Session Concepts

**Goal**: Understand stateless vs stateful authentication and why JWT alone isn't enough

## The Problem with Pure JWT

In Lesson 03, we learned that JWT tokens are great for stateless authentication. However, they have a **critical limitation**:

### JWT Limitation: Can't Revoke Tokens

Once a JWT token is issued, you **cannot invalidate it** until it expires. This creates security issues:

**Scenario 1: Token Theft**

```
1. Attacker steals user's JWT token
2. User changes password
3. Attacker still has valid token until expiration ❌
4. Attacker can access account for hours/days
```

**Scenario 2: User Logout**

```
1. User clicks "Logout"
2. Server can't invalidate the token
3. Token remains valid until expiration ❌
4. If token is stolen, attacker can still use it
```

**Scenario 3: Account Suspension**

```
1. Admin suspends user account
2. User's existing tokens remain valid ❌
3. User can still access system until tokens expire
```

## Stateless vs Stateful Authentication

### Stateless Authentication (Pure JWT)

**How it works:**

```
1. User logs in → Server creates JWT
2. Client stores JWT
3. Client sends JWT with each request
4. Server validates JWT (checks signature + expiration)
5. No server-side storage needed
```

**Pros:**

- ✅ Scalable (works across multiple servers)
- ✅ Fast (no database lookup)
- ✅ Simple implementation

**Cons:**

- ❌ Can't revoke tokens
- ❌ No logout control
- ❌ Security risk if token is stolen

### Stateful Authentication (JWT + Sessions)

**How it works:**

```
1. User logs in → Server creates JWT + stores session in Redis
2. Client stores JWT
3. Client sends JWT with each request
4. Server validates JWT AND checks if session exists in Redis
5. If session doesn't exist → Token is invalid (revoked)
```

**Pros:**

- ✅ Can revoke tokens immediately
- ✅ Proper logout functionality
- ✅ Better security control
- ✅ Can track active sessions

**Cons:**

- ⚠️ Requires Redis/database lookup (minimal performance impact)
- ⚠️ Slightly more complex

## Hybrid Approach: JWT + Redis Sessions

We'll use a **hybrid approach** that combines the best of both:

### Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Login Request
       ▼
┌─────────────┐
│   NestJS    │
│   Server    │
└──────┬──────┘
       │
       ├───► 2. Create JWT Token
       │
       ├───► 3. Store Session in Redis
       │     Key: token_id
       │     Value: { userId, email, createdAt }
       │     TTL: same as token expiration
       │
       └───► 4. Return JWT to Client
```

### How It Works

**Login Flow:**

```typescript
1. User logs in with email/password
2. Server validates credentials
3. Server creates JWT token
4. Server stores session in Redis:
   - Key: token_id (from JWT payload)
   - Value: user info + timestamp
   - TTL: token expiration time
5. Server returns JWT to client
```

**Request Validation Flow:**

```typescript
1. Client sends request with JWT token
2. Server validates JWT signature and expiration
3. Server extracts token_id from JWT
4. Server checks if session exists in Redis
5. If session exists → Request allowed ✅
6. If session doesn't exist → Token revoked, request denied ❌
```

**Logout Flow:**

```typescript
1. Client sends logout request with JWT token
2. Server extracts token_id from JWT
3. Server deletes session from Redis
4. Token is now invalid (even if not expired)
5. Server returns success
```

## Why Redis for Sessions?

### Redis is Perfect for Sessions

**Why Redis?**

- ✅ **Fast**: In-memory storage (microsecond lookups)
- ✅ **TTL Support**: Automatic expiration (matches token expiration)
- ✅ **Simple**: Key-value store (perfect for sessions)
- ✅ **Scalable**: Can be clustered for high availability

### Redis Session Structure

```typescript
// Session Key
`session:${tokenId}`

// Session Value (JSON)
{
  "userId": "user-123",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}

// TTL (Time To Live)
Same as JWT expiration (e.g., 1 hour)
```

## Token Blacklisting

**Token blacklisting** is the process of marking tokens as invalid even if they haven't expired.

### How Blacklisting Works

1. **Store active sessions** (whitelist approach):
   - Only tokens with active sessions are valid
   - If session doesn't exist → token is blacklisted

2. **Store revoked tokens** (blacklist approach):
   - Store revoked token IDs in Redis
   - Check if token ID is in blacklist before validating

**We'll use the whitelist approach** (simpler and more efficient):

- Active sessions = valid tokens
- No session = invalid token (blacklisted)

## Real-World Example

### Scenario: User Logs Out

**Without Sessions:**

```
1. User clicks "Logout"
2. Client deletes JWT from localStorage
3. But if token was copied, it's still valid ❌
4. Attacker can use token until expiration
```

**With Sessions:**

```
1. User clicks "Logout"
2. Server deletes session from Redis
3. Token is immediately invalid ✅
4. Even if token was copied, it won't work
5. Attacker gets 401 Unauthorized
```

## Key Concepts Summary

### Stateless Authentication

- No server-side storage
- Token contains all info
- Can't revoke tokens
- Example: Pure JWT

### Stateful Authentication

- Server stores session state
- Can revoke tokens
- Better security control
- Example: JWT + Redis sessions

### Hybrid Approach (What We'll Build)

- JWT for stateless validation
- Redis for session management
- Best of both worlds
- Production-ready solution

## What's Next?

Now that you understand why we need sessions, let's set up Redis in NestJS:

**Next Step**: [STEP-02-redis-setup.md](./STEP-02-redis-setup.md)

---

## Quick Quiz

1. **Why can't we revoke JWT tokens?**
   - Because they're stateless and validated by signature only

2. **What's the main advantage of adding Redis sessions?**
   - Ability to revoke tokens immediately

3. **What happens when a user logs out with sessions?**
   - Session is deleted from Redis, making the token invalid

4. **Why use Redis instead of PostgreSQL for sessions?**
   - Faster (in-memory), built-in TTL support, simpler key-value structure
