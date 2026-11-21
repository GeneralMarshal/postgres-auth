# postgres-auth

Authentication and authorization in NestJS, done properly: hashed passwords, JWTs, Redis-backed sessions and role guards on top of PostgreSQL + Prisma.

It also includes a **step-by-step tutorial** in [`tutorial/`](./tutorial) that explains how each part was built.

## Features

- User registration and login with bcrypt password hashing
- JWT access tokens (configurable expiry)
- Session storage and validation in Redis
- Role-based access control with guards, plus `@Public()`, `@Roles()` and `@User()` decorators
- Prisma ORM on PostgreSQL

## Tech stack

NestJS · TypeScript · Prisma · PostgreSQL · Redis · Passport JWT · Docker Compose

## Tutorial

1. [Setup and fundamentals](./tutorial/01-setup-and-fundamentals)
2. [Password security](./tutorial/02-password-security)
3. [JWT tokens deep dive](./tutorial/03-jwt-tokens-deep-dive)
4. [Session management](./tutorial/04-session-management)
5. [Authentication flow](./tutorial/05-authentication-flow)
6. [Authorization and guards](./tutorial/06-authorization-and-guards)
7. [Advanced features](./tutorial/07-advanced-features)
8. [Production ready](./tutorial/08-production-ready)

## API overview

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/users` | Register |
| `POST` | `/users/login` | Log in |
| `GET` | `/users/me`, `/users/profile` | Current user |
| `GET` | `/users`, `/users/:id` | List / get users |
| `PATCH` | `/users/:id` | Update a user |

## Getting started

```bash
docker compose up -d      # Postgres + Redis
npm install
npx prisma migrate dev
npm run start:dev
```

Environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `PORT`.
