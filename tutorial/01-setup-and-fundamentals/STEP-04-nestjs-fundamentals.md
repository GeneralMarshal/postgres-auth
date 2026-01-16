# STEP 04: NestJS Fundamentals

**Goal**: Understand NestJS architecture, dependency injection, and module structure

## Why Understanding Architecture Matters

Before building authentication, you need to understand **how** NestJS works. This foundation will make everything else easier.

## Core Concepts

### 1. Modules

**What is a Module?**

A module is a container that groups related code together.

```typescript
@Module({
  imports: [OtherModule],
  controllers: [MyController],
  providers: [MyService],
  exports: [MyService],
})
export class MyModule {}
```

**Breaking it down**:

- **`imports`**: Other modules this module needs
- **`controllers`**: Route handlers (HTTP endpoints)
- **`providers`**: Services, guards, strategies (business logic)
- **`exports`**: What other modules can use from this module

**Real example from our code**:

```typescript
@Module({
  imports: [PrismaModule],
  // PrismaModule is @Global(), so PrismaService is available everywhere
})
export class UsersModule {}
```

**What this means**:
- This module can use `PrismaService` (because PrismaModule is global)
- No need to export - PrismaService is available everywhere

### 2. Dependency Injection

**What is Dependency Injection?**

Instead of creating objects yourself, NestJS creates them and gives them to you.

**Without DI (bad)**:

```typescript
class MyController {
  private myService = new MyService(); // ❌ Creating it yourself
}
```

**With DI (good)**:

```typescript
class MyController {
  constructor(private myService: MyService) {} // ✅ NestJS provides it
}
```

**How it works**:

1. You declare what you need in constructor
2. NestJS looks for it in the module's `providers`
3. Creates instance (or reuses existing)
4. Injects it automatically

**Example**:

```typescript
// Service
@Injectable()
export class UserService {
  // ...
}

// Controller
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {} // ✅ Injected!
  
  @Get()
  findAll() {
    return this.userService.findAll(); // Use it!
  }
}

// Module
@Module({
  controllers: [UserController],
  providers: [UserService], // ✅ Makes it available for injection
})
export class UsersModule {}
```

**Why this is powerful**:

- **Testable**: Can inject mock services in tests
- **Flexible**: Easy to swap implementations
- **Clean**: No manual object creation

### 3. Providers

**What is a Provider?**

Any class that can be injected. Usually services, but also guards, strategies, etc.

**Making a class a provider**:

```typescript
@Injectable()
export class UserService {
  // This can now be injected!
}
```

**The `@Injectable()` decorator**:
- Tells NestJS "this class can be injected"
- Without it, NestJS won't know how to create it

**Types of providers**:

1. **Services** (business logic):
   ```typescript
   @Injectable()
   export class UserService { ... }
   ```

2. **Guards** (authentication/authorization):
   ```typescript
   @Injectable()
   export class AuthGuard { ... }
   ```

3. **Strategies** (Passport strategies):
   ```typescript
   @Injectable()
   export class JwtStrategy { ... }
   ```

### 4. Controllers

**What is a Controller?**

Handles HTTP requests and returns responses.

```typescript
@Controller('users')
export class UserController {
  @Get()
  findAll() {
    return 'Get all users';
  }
  
  @Post()
  create() {
    return 'Create user';
  }
}
```

**Breaking it down**:

- `@Controller('users')`: Route prefix = `/users`
- `@Get()`: Handles GET requests
- `@Post()`: Handles POST requests
- Method name doesn't matter (just for readability)

**Resulting routes**:
- `GET /users` → `findAll()`
- `POST /users` → `create()`

**Parameter decorators**:

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return `Get user ${id}`;
}

@Post()
create(@Body() createUserDto: CreateUserDto) {
  return 'Create user';
}
```

- `@Param('id')`: Route parameter
- `@Body()`: Request body (JSON)
- `@Query()`: Query parameters (`?name=John`)

### 5. Services

**What is a Service?**

Contains business logic. Controllers are thin - they just receive requests and delegate to services.

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  
  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }
  
  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }
}
```

**Why separate services from controllers?**

- **Reusability**: Multiple controllers can use same service
- **Testability**: Test business logic without HTTP
- **Organization**: Clear separation of concerns

## Building a Complete Example

Let's create a simple example to see everything work together:

### 1. Create User Service

Create `src/users/users.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(email: string, password: string, name?: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        password,
        name,
      },
    });
  }
}
```

**What's happening**:

```typescript
constructor(private prisma: PrismaService) {}
```

- `PrismaService`: Injected Prisma service (available because PrismaModule is global)
- `prisma.user`: Access to User model operations
- Provides methods: `findMany()`, `findUnique()`, `create()`, `update()`, `delete()`, etc.
- Fully type-safe with autocomplete!

### 2. Create User Controller

Create `src/users/users.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: { email: string; password: string; name?: string }) {
    return this.usersService.create(
      createUserDto.email,
      createUserDto.password,
      createUserDto.name,
    );
  }
}
```

**What's happening**:

- `@Controller('users')`: All routes start with `/users`
- `constructor`: Injects `UsersService` (dependency injection!)
- `@Get()`: Handles GET requests
- `@Post()`: Handles POST requests
- `@Body()`: Extracts JSON body from request

### 3. Update Users Module

Update `src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule], // PrismaService is available (PrismaModule is @Global())
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

**What's happening**:

- `imports: [PrismaModule]`: Makes PrismaService available (though it's global, explicit is good)
- `controllers: [UsersController]`: Register controller
- `providers: [UsersService]`: Register service (makes it injectable)
- `exports: [UsersService]`: Other modules can use this service

### 4. Test It

Start the server:

```bash
npm run start:dev
```

**Test endpoints**:

```bash
# Get all users (empty initially)
curl http://localhost:3000/users

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Get all users (should see the one you created)
curl http://localhost:3000/users

# Get specific user (use the ID from previous response)
curl http://localhost:3000/users/<user-id>
```

## Understanding the Flow

```
HTTP Request
    ↓
Controller (receives request)
    ↓
Service (business logic)
    ↓
Repository (database operations)
    ↓
Database
    ↓
Response flows back up
```

**Example**:

1. `GET /users` request comes in
2. `UsersController.findAll()` receives it
3. Calls `UsersService.findAll()`
4. Service calls `prisma.user.findMany()`
5. Prisma Client queries database
6. Results flow back: Database → Prisma Client → Service → Controller → Response

## Key Takeaways

1. **Modules organize code**: Group related controllers, services together
2. **Dependency Injection is automatic**: Declare what you need, NestJS provides it
3. **Controllers are thin**: Just receive requests, delegate to services
4. **Services contain logic**: Business logic lives in services
5. **Prisma Client accesses data**: PrismaService provides type-safe database access

## Common Patterns

### Pattern 1: Service Uses PrismaService

```typescript
@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}
}
```

### Pattern 2: Controller Uses Service

```typescript
@Controller('my')
export class MyController {
  constructor(private myService: MyService) {}
}
```

### Pattern 3: Module Wires Everything

```typescript
@Module({
  imports: [PrismaModule], // PrismaService available (global)
  controllers: [MyController],
  providers: [MyService],
})
export class MyModule {}
```

## What's Next?

✅ **You've completed**: NestJS fundamentals and architecture understanding

➡️ **Next lesson**: [Lesson 02: Password Security](../02-password-security/README.md) - Implement password hashing and user registration

## Summary

You now understand:

- ✅ How modules organize code
- ✅ How dependency injection works
- ✅ How controllers handle requests
- ✅ How services contain business logic
- ✅ How Prisma Client interacts with database
- ✅ How everything connects together

**You're ready to build authentication!** 🚀

---

**Congratulations!** You've completed Lesson 01. Move on to Lesson 02 to start building authentication features!
