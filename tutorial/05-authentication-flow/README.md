# Lesson 05: Authentication Flow

**Goal**: Understand complete authentication flow, implement Passport.js strategies, guards, and protect routes

## What You'll Learn

By the end of this lesson, you will:

- ✅ Understand complete authentication flow
- ✅ Understand Passport.js and strategies
- ✅ Implement JWT strategy with Passport
- ✅ Create authentication guards
- ✅ Understand request flow through guards
- ✅ Protect routes with authentication
- ✅ Extract user from request
- ✅ Understand guard execution order

## Prerequisites

- ✅ Completed Lesson 04
- ✅ Sessions working with Redis
- ✅ JWT tokens generated and validated
- ✅ Session validation service implemented

## Lesson Structure

This lesson is broken into 5 steps:

1. **STEP-01-authentication-flow-concepts.md** - Understand authentication flow and Passport.js concepts
2. **STEP-02-passport-setup.md** - Set up Passport.js in NestJS
3. **STEP-03-jwt-strategy.md** - Implement JWT strategy with session validation
4. **STEP-04-authentication-guards.md** - Create authentication guards
5. **STEP-05-protected-routes.md** - Protect routes and extract user from request

## Getting Started

1. Start with **STEP-01-authentication-flow-concepts.md**
2. Follow each step in order
3. Build along with the code examples
4. Test everything as you go

## Time Estimate

- **STEP 01**: 30 minutes (reading concepts)
- **STEP 02**: 20 minutes
- **STEP 03**: 35 minutes
- **STEP 04**: 30 minutes
- **STEP 05**: 25 minutes

**Total**: ~140 minutes

## Key Concepts

- Authentication vs Authorization
- Passport.js strategies
- JWT strategy implementation
- Guards and their execution order
- Request flow through guards
- Protected routes
- User extraction from JWT payload

## Why This Matters

So far, you've built:

- ✅ User registration and login
- ✅ JWT token generation
- ✅ Session management with Redis

But you haven't **protected** any routes yet! Anyone can access any endpoint. This lesson teaches you how to:

- ✅ Require authentication for certain routes
- ✅ Extract user information from tokens
- ✅ Automatically validate tokens on protected routes
- ✅ Use industry-standard patterns (Passport.js)

## Next Steps

After completing this lesson, you'll move to **Lesson 06: Authorization and Guards** where you'll learn about role-based access control and permission checking.

---

**Ready?** Start with [STEP-01-authentication-flow-concepts.md](./STEP-01-authentication-flow-concepts.md)!
