# STEP 03: Prisma Configuration

**Goal**: Configure Prisma with PostgreSQL and create your first User model

## Why Prisma?

Before we start, let's understand **why** we use Prisma:

### The Problem with Raw SQL

- Writing SQL queries manually is error-prone
- No type safety
- Hard to maintain
- Different SQL dialects (PostgreSQL vs MySQL)

### The Solution: Prisma

Prisma provides:

1. **Type Safety**: Auto-generated TypeScript types from your schema
2. **Schema-First**: Define your database structure in one place
3. **Better DX**: Excellent developer experience with autocomplete
4. **Auto-Generated Client**: No need to write database access code
5. **Migrations**: Version control for database schema

**Think of it as**: Your database schema as code, with auto-generated type-safe queries.

## Step-by-Step Instructions

### 1. Initialize Prisma

Create Prisma configuration:

```bash
npx prisma init
```

**What this does**:

- Creates `prisma/` folder
- Creates `prisma/schema.prisma` file (your database schema)
- Creates `.env` file (if it doesn't exist)
- Adds `DATABASE_URL` to `.env`

### 2. Configure Database Connection

Update `.env` file (or verify it's correct):

```env
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_tutorial?schema=public"
```

**Let's break down the connection string**:

```
postgresql://[username]:[password]@[host]:[port]/[database]?schema=public
```

- `auth_user`: Database username
- `auth_password`: Database password
- `localhost`: Database host
- `5432`: PostgreSQL port
- `auth_tutorial`: Database name
- `schema=public`: PostgreSQL schema (usually `public`)

### 3. Create User Model

Update `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Let's understand each part**:

#### Generator

```prisma
generator client {
  provider = "prisma-client-js"
}
```

- Tells Prisma to generate JavaScript/TypeScript client
- Run `npx prisma generate` to create the client

#### Datasource

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- `provider`: Database type (postgresql, mysql, sqlite, etc.)
- `url`: Connection string from `.env` file

#### Model User

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Field by field**:

- `id String @id @default(uuid())`: Primary key, auto-generates UUID
- `email String @unique`: Unique email (no duplicates)
- `password String`: Will store hashed password (we'll hash it in Lesson 02)
- `name String?`: Optional field (`?` means nullable)
- `isActive Boolean @default(true)`: Defaults to `true`
- `createdAt DateTime @default(now())`: Auto-set on creation
- `updatedAt DateTime @updatedAt`: Auto-updated on change

**Why UUID?**

- Globally unique (no collisions across databases)
- Harder to guess (security)
- Works in distributed systems

### 4. Create PrismaService

Create `src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**What this does**:

- `extends PrismaClient`: Inherits all Prisma Client methods
- `implements OnModuleInit`: Connects when module starts
- `implements OnModuleDestroy`: Disconnects when module stops
- `@Injectable()`: Makes it injectable in NestJS

**Why this pattern?**

- Manages database connection lifecycle
- Reusable across all modules
- Follows NestJS best practices

### 5. Create PrismaModule

Create `src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**What this does**:

- `@Global()`: Makes PrismaService available everywhere (no need to import in every module)
- `providers: [PrismaService]`: Registers PrismaService
- `exports: [PrismaService]`: Makes it available to other modules

### 6. Import PrismaModule in AppModule

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true, // Available everywhere
      envFilePath: '.env',
    }),
    PrismaModule, // Add this
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**What this does**:

- `ConfigModule.forRoot()`: Loads `.env` file globally
- `PrismaModule`: Makes PrismaService available everywhere

### 7. Generate Prisma Client

Generate the Prisma Client (TypeScript types and query methods):

```bash
npx prisma generate
```

**What this does**:

- Reads `prisma/schema.prisma`
- Generates TypeScript types
- Creates `@prisma/client` package
- You'll see types like `User`, `Prisma.UserCreateInput`, etc.

**Expected output**:

```
✔ Generated Prisma Client (version X.X.X) to ./node_modules/@prisma/client
```

### 8. Push Schema to Database

Push your schema to the database (creates tables):

```bash
npx prisma db push
```

**What this does**:

- Reads your Prisma schema
- Creates/updates tables in database
- **⚠️ Development only!** Similar to TypeORM's `synchronize: true`

**Expected output**:

```
✔ Your database is now in sync with your schema.
```

**Important**: `prisma db push` is for development. For production, use `prisma migrate` (we'll cover this later).

### 9. Test the Connection

Start the application:

```bash
npm run start:dev
```

**Expected output**:

```
[Nest] INFO  [NestFactory] Successfully started the application
```

**If you see connection errors**:

1. Make sure Docker containers are running: `docker-compose ps`
2. Check `.env` file has correct `DATABASE_URL`
3. Check PostgreSQL is healthy: `docker-compose logs postgres`
4. Verify Prisma Client was generated: `npx prisma generate`

### 10. Verify Table Was Created

**Option 1: Using Prisma Studio** (Recommended)

Prisma Studio is a visual database browser:

```bash
npx prisma studio
```

This opens a browser at `http://localhost:5555` where you can:

- View all tables
- See table structure
- Browse data
- Edit records (careful in production!)

**Option 2: Using SQL**

Connect to PostgreSQL:

```bash
docker exec -it auth-tutorial-postgres psql -U auth_user -d auth_tutorial
```

List tables:

```sql
\dt
```

**Expected output**:

```
          List of relations
 Schema | Name  | Type  |  Owner
--------+-------+-------+----------
 public | User  | table | auth_user
```

Check table structure:

```sql
\d "User"
```

**Expected output**:

```
Column      | Type                        | Nullable
------------+-----------------------------+----------
id          | uuid                        | not null
email       | character varying           | not null
password    | character varying           | not null
name        | character varying          | nullable
isActive    | boolean                     | not null
createdAt   | timestamp without time zone | not null
updatedAt   | timestamp without time zone | not null
```

Exit: `\q`

## Understanding What Happened

1. **Prisma schema defined** the User model structure
2. **Prisma Client generated** TypeScript types and query methods
3. **PrismaService created** to manage database connection
4. **PrismaModule registered** PrismaService globally
5. **Schema pushed to database** created the `User` table
6. **All fields and constraints** were applied (unique, defaults, etc.)

## Key Concepts

### 1. Models = Database Tables

```prisma
model User {
  id String @id @default(uuid())
  // ...
}
```

- This model **represents** the `User` table
- Each field = a column
- Prisma generates TypeScript types automatically

### 2. Schema Defines Structure

```prisma
email String @unique
```

- `String` = column type
- `@unique` = database constraint
- Prisma creates the constraint automatically

### 3. Prisma db push (Development Only!)

```bash
npx prisma db push  // ⚠️ DEV ONLY!
```

**What it does**:

- Auto-creates/updates tables from schema
- Quick and easy for development
- **Dangerous in production!** Can lose data

**In production**:

- Use `prisma migrate` instead
- Creates migration files
- Version control for database changes
- We'll cover this in later lessons

### 4. Prisma Client

Prisma Client is the auto-generated database client:

```typescript
// In a service (we'll create this later)
constructor(private prisma: PrismaService) {}

async findAll() {
  return this.prisma.user.findMany(); // ✅ Type-safe!
}
```

- `prisma.user` = access to User model
- `findMany()` = get all users
- Fully type-safe with autocomplete!

## Migration Strategies

### Development: `prisma db push`

**When to use**:

- During development
- Quick prototyping
- Learning/tutorials

**Command**:

```bash
npx prisma db push
```

**Pros**:

- Fast and simple
- No migration files
- Good for iteration

**Cons**:

- No migration history
- Can't roll back easily
- Not for production

### Production: `prisma migrate`

**When to use**:

- Production deployments
- Team collaboration
- When you need version control

**Command**:

```bash
npx prisma migrate dev --name init
```

**Pros**:

- Version controlled
- Can review changes
- Rollback support
- Team-friendly

**Cons**:

- More steps
- Slightly more complex

**Note**: We'll cover `prisma migrate` in detail in later lessons. For now, use `prisma db push` for development.

## What's Next?

✅ **You've completed**: Prisma configuration and User model

➡️ **Next step**: [STEP-04-nestjs-fundamentals.md](./STEP-04-nestjs-fundamentals.md) - Understand NestJS architecture

## Key Takeaways

1. **Prisma = Schema-First**: Define database in `schema.prisma`
2. **Models = Tables**: Prisma models represent database tables
3. **Auto-Generated Types**: Prisma generates TypeScript types
4. **PrismaService Pattern**: Standard NestJS integration
5. **db push = Dev Only**: Use migrations in production
6. **Prisma Studio**: Visual database browser

---

**Ready for the next step?** Let's understand NestJS fundamentals!
