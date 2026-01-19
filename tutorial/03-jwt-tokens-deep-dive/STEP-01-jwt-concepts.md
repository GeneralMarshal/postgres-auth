# STEP 01: JWT Concepts

**Goal**: Understand JWT structure, why we use them, and how they work

## What is a JWT?

**JWT** stands for **JSON Web Token**. It's a compact, URL-safe way to represent claims (information) that can be transferred between two parties.

### Real-World Analogy

Think of a JWT like a **concert ticket**:

- **Ticket** (JWT): Contains your seat number, show time, and venue
- **Security stamp** (Signature): Proves the ticket is authentic
- **Expiration date**: Ticket is only valid for the show date

You show the ticket at the door (send JWT with request), and they verify it's real (validate signature) and not expired (check expiration).

## Why Use JWT Tokens?

### The Problem: Stateless Authentication

**Without JWT** (Session-based):

```
1. User logs in → Server creates session
2. Server stores session in database/Redis
3. User makes request → Server checks session in database
4. Every request = database lookup ❌
```

**Problems**:

- Database lookup on every request (slow)
- Hard to scale across multiple servers
- Server must maintain session state

**With JWT** (Token-based):

```
1. User logs in → Server creates JWT token
2. Server sends token to client
3. User makes request → Client sends token
4. Server validates token (no database lookup!) ✅
```

**Benefits**:

- ✅ **Stateless**: No server-side storage needed
- ✅ **Scalable**: Works across multiple servers
- ✅ **Fast**: No database lookup required
- ✅ **Portable**: Token contains all needed info

### When to Use JWT

**✅ Good for**:

- API authentication
- Microservices communication
- Mobile app authentication
- Single-page applications (SPA)

**❌ Not ideal for**:

- Logout (can't revoke token easily)
- Sensitive data (token is readable)
- Very short-lived sessions

## JWT Structure

A JWT has **3 parts** separated by dots (`.`):

```
header.payload.signature
```

### Example JWT

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Breaking it down**:

- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` = Header (base64 encoded)
- `eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ` = Payload (base64 encoded)
- `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c` = Signature

### Part 1: Header

The header contains metadata about the token:

```json
{
  "alg": "HS256", // Algorithm used (HMAC SHA256)
  "typ": "JWT" // Type of token
}
```

**What it tells us**:

- `alg`: How the token was signed (HS256, RS256, etc.)
- `typ`: Always "JWT" for JSON Web Tokens

### Part 2: Payload (Claims)

The payload contains the **claims** (data) about the user:

```json
{
  "sub": "user-123", // Subject (user ID)
  "email": "user@example.com", // User email
  "iat": 1516239022, // Issued at (timestamp)
  "exp": 1516242622 // Expiration (timestamp)
}
```

**Standard Claims** (JWT spec):

- `sub` (subject): User identifier
- `iat` (issued at): When token was created
- `exp` (expiration): When token expires
- `iss` (issuer): Who created the token
- `aud` (audience): Who the token is for

**Custom Claims** (your app):

- `email`: User's email
- `role`: User's role
- `name`: User's name

**⚠️ Important**: Payload is **base64 encoded**, not encrypted! Anyone can decode it.

### Part 3: Signature

The signature proves the token is authentic and hasn't been tampered with:

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**How it works**:

1. Server signs token with secret key
2. Client sends token with request
3. Server verifies signature matches
4. If signature matches → token is valid ✅
5. If signature doesn't match → token is invalid ❌

**Security**: Even though payload is readable, signature prevents tampering!

## How JWT Authentication Works

### Step 1: Login

```
User → POST /users/login
  email: "user@example.com"
  password: "password123"

Server → Validates credentials
  ✅ Password matches
  ✅ Creates JWT token
  ✅ Returns token to client
```

### Step 2: Authenticated Request

```
Client → GET /users/profile
  Headers:
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Server → Validates token
  ✅ Checks signature
  ✅ Checks expiration
  ✅ Extracts user ID from payload
  ✅ Returns user data
```

### Step 3: Token Expiration

```
Client → GET /users/profile
  Headers:
    Authorization: Bearer expired-token...

Server → Validates token
  ❌ Token expired!
  → Returns 401 Unauthorized
```

## JWT Security Considerations

### ✅ Good Practices

1. **Use HTTPS**: Tokens can be intercepted over HTTP
2. **Short expiration**: 15 minutes to 1 hour for access tokens
3. **Strong secret**: Use long, random secret key
4. **Don't store sensitive data**: Payload is readable
5. **Validate signature**: Always verify token signature

### ❌ Common Mistakes

1. **Storing passwords in JWT**: Payload is readable!
2. **No expiration**: Tokens valid forever (security risk)
3. **Weak secret**: Easy to guess = easy to forge
4. **Sending in URL**: Tokens in URLs can be logged
5. **Too much data**: Large payloads = larger tokens

## JWT vs Sessions

### JWT (Stateless)

**Pros**:

- ✅ No server-side storage
- ✅ Works across multiple servers
- ✅ Fast (no database lookup)

**Cons**:

- ❌ Can't revoke easily (until expiration)
- ❌ Payload is readable
- ❌ Larger than session ID

### Sessions (Stateful)

**Pros**:

- ✅ Can revoke immediately
- ✅ Server controls everything
- ✅ Smaller (just session ID)

**Cons**:

- ❌ Requires database/Redis
- ❌ Database lookup on every request
- ❌ Harder to scale

### Best Practice: Hybrid Approach

Use **JWT + Redis**:

- JWT for stateless authentication
- Redis for session management
- Best of both worlds!

(We'll cover this in Lesson 04)

## Token Types

### Access Token

- **Purpose**: Authenticate API requests
- **Lifetime**: Short (15 min - 1 hour)
- **Storage**: Memory (JavaScript variable)
- **Contains**: User ID, permissions

### Refresh Token

- **Purpose**: Get new access token
- **Lifetime**: Long (7-30 days)
- **Storage**: HttpOnly cookie (more secure)
- **Contains**: User ID only

**Flow**:

```
1. Login → Get access token + refresh token
2. Access token expires → Use refresh token to get new access token
3. Refresh token expires → User must login again
```

## Key Concepts Summary

1. **JWT = 3 parts**: header.payload.signature
2. **Stateless**: No server-side storage needed
3. **Signed**: Signature proves authenticity
4. **Readable**: Payload is base64, not encrypted
5. **Expires**: Tokens have expiration time
6. **Portable**: Contains all needed info

## What's Next?

Now that you understand JWT concepts, let's set up JWT in your NestJS project!

➡️ **Next step**: [STEP-02-jwt-setup.md](./STEP-02-jwt-setup.md) - Install and configure JWT module

---

**Key Takeaways**:

1. JWT = header.payload.signature
2. Stateless authentication (no database lookup)
3. Payload is readable (don't store sensitive data)
4. Signature prevents tampering
5. Tokens expire for security
