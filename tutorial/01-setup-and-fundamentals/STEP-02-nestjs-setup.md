8# STEP 02: NestJS Project Setup

**Goal**: Initialize NestJS project and install required dependencies

## Why NestJS?

Before we start, let's understand **why** we use NestJS instead of plain Express:

### The Problem with Express

- No structure - you organize code however you want
- No built-in dependency injection
- Manual setup for everything (validation, error handling, etc.)
- Easy to write messy, unmaintainable code

### The Solution: NestJS

NestJS provides:

1. **Structure**: Modules, controllers, services - clear organization
2. **Dependency Injection**: Automatic dependency management
3. **Built-in Features**: Validation, error handling, guards, interceptors
4. **TypeScript First**: Full TypeScript support
5. **Scalable**: Easy to grow from small to large applications

**Think of it as**: Express with structure and best practices built-in.

## Step-by-Step Instructions

### 1. Install NestJS CLI

The NestJS CLI helps create and manage projects:

```bash
npm i -g @nestjs/cli
```

**What this does**: Installs the CLI globally so you can use `nest` command anywhere.

**Verify installation**:
```bash
nest --version
```

### 2. Create NestJS Project

Create a new NestJS project:

```bash
nest new auth-tutorial
```

**What happens**:
- Creates a new folder `auth-tutorial`
- Sets up project structure
- Installs dependencies
- Configures TypeScript

**When prompted**:
- Package manager: Choose `npm` (or `yarn` if you prefer)

### 3. Navigate to Project

```bash
cd auth-tutorial
```

### 4. Install Required Dependencies

We need several packages for authentication:

```bash
npm install @prisma/client
npm install prisma --save-dev
npm install @nestjs/config
npm install @nestjs/passport passport passport-jwt
npm install @nestjs/jwt
npm install bcryptjs
npm install class-validator class-transformer
npm install ioredis
npm install @types/bcryptjs @types/passport-jwt --save-dev
```

**Let's understand each package**:

#### Database & ORM
- `@prisma/client`: Prisma Client (auto-generated, type-safe database client)
- `prisma`: Prisma CLI (dev dependency - used for migrations and schema management)

#### Configuration
- `@nestjs/config`: Manage environment variables

#### Authentication
- `@nestjs/passport`: NestJS integration for Passport.js
- `passport`: Authentication middleware
- `passport-jwt`: JWT strategy for Passport
- `@nestjs/jwt`: JWT utilities for NestJS
- `@types/passport-jwt`: TypeScript types

#### Security
- `bcryptjs`: Password hashing library
- `@types/bcryptjs`: TypeScript types

#### Validation
- `class-validator`: Validate DTOs (Data Transfer Objects)
- `class-transformer`: Transform plain objects to class instances

#### Session Storage
- `ioredis`: Redis client for Node.js

### 5. Project Structure

Your project should now look like:

```
auth-tutorial/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
├── .eslintrc.js
├── .gitignore
├── nest-cli.json
├── package.json
├── package-lock.json
├── tsconfig.json
└── tsconfig.build.json
```

### 6. Create Environment File

Create a `.env` file in the root:

```bash
touch .env
```

Add environment variables:

```env
# Database Configuration (Prisma uses DATABASE_URL)
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_tutorial?schema=public"

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=4d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=development
```

**Important**: 
- Never commit `.env` to git (it's already in `.gitignore`)
- Change `JWT_SECRET` to something random in production
- Use different secrets for different environments

### 7. Update .gitignore

Make sure `.env` is in `.gitignore`:

```
# ... existing entries ...
.env
```

### 8. Test the Setup

Start the development server:

```bash
npm run start:dev
```

**Expected output**:
```
[Nest] INFO  [NestFactory] Starting Nest application...
[Nest] INFO  [InstanceLoader] AppModule dependencies initialized
[Nest] INFO  [NestFactory] Successfully started the application
```

Visit `http://localhost:3000` - you should see "Hello World!"

Press `Ctrl+C` to stop the server.

## Understanding the Project Structure

### src/main.ts

This is the entry point of your application:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

**What it does**:
1. Creates a NestJS application from `AppModule`
2. Starts listening on port 3000

### src/app.module.ts

The root module of your application:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**What it does**:
- Defines what controllers and services the app uses
- We'll add more modules here as we build

### src/app.controller.ts

Handles HTTP requests:

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

**What it does**:
- `@Controller()`: Marks this as a controller
- `@Get()`: Handles GET requests to `/`
- `constructor`: Injects `AppService` (dependency injection!)

## Key Concepts Introduced

### 1. Dependency Injection

Look at `AppController`:

```typescript
constructor(private readonly appService: AppService) {}
```

**What's happening**:
- NestJS automatically creates `AppService` instance
- Injects it into `AppController`
- You don't write `new AppService()` - NestJS does it!

**Why this is powerful**:
- Easy to test (can inject mock services)
- Loose coupling (controller doesn't create service)
- Automatic dependency resolution

### 2. Decorators

`@Controller()`, `@Get()`, `@Module()` are **decorators**.

**What they do**:
- Add metadata to classes/methods
- Tell NestJS how to use them
- No code needed - just annotations

**Example**:
```typescript
@Get()  // This method handles GET requests
getHello() { ... }
```

### 3. Modules

Modules are containers that organize code:

```typescript
@Module({
  controllers: [AppController],  // What controllers to use
  providers: [AppService],      // What services to use
})
```

**Why modules**:
- Organize related code together
- Control what's available where
- Enable code splitting

## What's Next?

✅ **You've completed**: NestJS project setup with all dependencies

➡️ **Next step**: [STEP-03-prisma-config.md](./STEP-03-prisma-config.md) - Configure Prisma and create User model

## Key Takeaways

1. **NestJS provides structure**: Clear organization with modules, controllers, services
2. **Dependency Injection is automatic**: NestJS creates and injects dependencies
3. **Decorators add metadata**: Tell NestJS how to use your code
4. **Environment variables**: Store configuration in `.env` (never commit!)
5. **TypeScript first**: Full type safety throughout

---

**Ready for the next step?** Let's configure Prisma!
