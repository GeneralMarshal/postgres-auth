# STEP 04: Integrate JWT with Login

**Goal**: Return JWT token when user logs in successfully

## What We're Building

Update the login endpoint to:
1. Validate user credentials (already done)
2. Generate JWT token
3. Return token in response

## Step 1: Update Users Service

Update `src/users/users.service.ts`:

```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { User } from '@prisma/client';
import { PasswordService } from 'src/common/services/password.service';
import { AuthJwtService } from 'src/auth/services/jwt.service'; // Add this
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private jwtService: AuthJwtService, // Add this
  ) {}

  // ... existing methods ...

  async login(loginUserDto: LoginUserDto) {
    const user = await this.findByEmail(loginUserDto.email);

    if (!user) {
      throw new NotFoundException('Invalid Email or Password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is Inactive');
    }

    // Verify password
    const isVerified = await this.passwordService.comparePassword(
      loginUserDto.password,
      user.password,
    );

    if (!isVerified) {
      throw new UnauthorizedException('Invalid Email or Password');
    }

    // Generate JWT token
    const token = await this.jwtService.generateToken(user.id, user.email);

    // Return user data and token
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken: token,
    };
  }
}
```

**What changed**:

1. **Imported AuthJwtService**
2. **Injected in constructor**
3. **Generate token after successful login**
4. **Return token with user data**

## Step 2: Update Users Module

Update `src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module'; // Add this

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule, // Add this - provides AuthJwtService
  ],
  controllers: [UserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UserModule {}
```

**What changed**:
- Added `AuthModule` to imports
- Makes `AuthJwtService` available for injection

## Step 3: Test the Login Endpoint

### Test 1: Successful Login

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected response** (200 OK):
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notice**:
- ✅ User data (without password)
- ✅ Access token included
- ✅ Token is a long string

### Test 2: Invalid Credentials

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }'
```

**Expected response** (401 Unauthorized):
```json
{
  "statusCode": 401,
  "message": "Invalid Email or Password",
  "error": "Unauthorized"
}
```

**Notice**: No token returned (login failed)

### Test 3: Decode the Token

You can decode the token to see its contents (using [jwt.io](https://jwt.io) or code):

```typescript
// Temporary test
import { JwtService } from '@nestjs/jwt';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const jwtService = new JwtService();
const decoded = jwtService.decode(token);
console.log(decoded);
```

**Expected**:
```json
{
  "sub": "user-uuid",
  "email": "test@example.com",
  "iat": 1704067200,
  "exp": 1704070800
}
```

## Understanding the Response

### Response Structure

```json
{
  "user": { ... },
  "accessToken": "..."
}
```

**Why this structure?**
- **user**: User data for frontend (display name, email, etc.)
- **accessToken**: Token for authenticated requests

### Frontend Usage

```typescript
// After login
const response = await login(email, password);
const { user, accessToken } = response;

// Store token
localStorage.setItem('token', accessToken);

// Use token in requests
fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Security Considerations

### ✅ Good Practices

1. **HTTPS only**: Always use HTTPS in production
2. **Token storage**: 
   - Memory (best for web apps)
   - HttpOnly cookie (more secure)
   - NOT localStorage (XSS risk)
3. **Short expiration**: 1 hour or less
4. **Don't log tokens**: Never log tokens in production

### ❌ Common Mistakes

1. **Storing in localStorage**: Vulnerable to XSS
2. **Long expiration**: Tokens valid too long
3. **Logging tokens**: Security risk
4. **Sending in URL**: Can be logged

## Token Expiration

### Check Token Expiration

Tokens automatically expire based on `JWT_EXPIRES_IN`:

```typescript
// Token expires after 1 hour (from .env)
// After expiration:
const payload = await jwtService.verifyToken(expiredToken);
// Returns null (token expired)
```

### Handle Expired Tokens

Frontend should handle 401 responses:

```typescript
// Frontend code
try {
  const response = await fetch('/api/users/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 401) {
    // Token expired - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
} catch (error) {
  // Handle error
}
```

## Key Concepts

### 1. Token Generation After Login

```typescript
const token = await this.jwtService.generateToken(user.id, user.email);
```

- Only generate after successful authentication
- Include user ID in token
- Token expires automatically

### 2. Response Structure

```typescript
return {
  user: userWithoutPassword,
  accessToken: token,
};
```

- User data for display
- Token for authentication
- Never return password

### 3. Module Imports

```typescript
imports: [AuthModule]
```

- Makes JWT service available
- Dependency injection works
- Clean module structure

## Common Mistakes

### ❌ Wrong: Return Token Only

```typescript
return { accessToken: token }; // ❌ No user data
```

### ✅ Correct: Return User + Token

```typescript
return {
  user: userWithoutPassword,
  accessToken: token,
}; // ✅ Both user and token
```

### ❌ Wrong: Generate Token Before Validation

```typescript
const token = await this.jwtService.generateToken(user.id, user.email);
// ... then validate password ❌
```

### ✅ Correct: Validate First

```typescript
// Validate password first
if (!isVerified) {
  throw new UnauthorizedException('Invalid credentials');
}
// Then generate token ✅
const token = await this.jwtService.generateToken(user.id, user.email);
```

## What's Next?

✅ **You've completed**: JWT integration with login endpoint

➡️ **Next lesson**: [Lesson 04: Session Management](../04-session-management/README.md) - Learn about Redis sessions and why JWT alone isn't enough

## Key Takeaways

1. **Generate token after successful login**: Only when credentials are valid
2. **Return user + token**: Frontend needs both
3. **Never return password**: Security best practice
4. **Token expires automatically**: Based on JWT_EXPIRES_IN
5. **Module imports**: AuthModule provides JWT service

## Lesson 03 Summary

You've learned:
- ✅ JWT structure (header.payload.signature)
- ✅ Why we use JWT tokens (stateless auth)
- ✅ How to create and sign tokens
- ✅ How to verify tokens
- ✅ JWT claims and expiration
- ✅ Integration with login endpoint

**Next**: We'll add session management with Redis to make authentication more secure and allow logout!

---

**Congratulations!** You've completed Lesson 03. You now understand JWT tokens!
