# Deep Dive: Core Concepts

This document explains the fundamental concepts you need to understand for backend authentication.

## 1. Dependency Injection (DI)

### What It Is

Dependency Injection is a design pattern where objects receive their dependencies from an external source, rather than creating them internally.

### Why It Matters

**Without DI**:
```typescript
class UserController {
  private userService = new UserService(); // ❌ Tightly coupled
  private emailService = new EmailService(); // ❌ Hard to test
}
```

**Problems**:
- Can't easily swap implementations
- Hard to test (can't inject mocks)
- Tightly coupled code

**With DI**:
```typescript
class UserController {
  constructor(
    private userService: UserService, // ✅ Injected
    private emailService: EmailService, // ✅ Injected
  ) {}
}
```

**Benefits**:
- Loose coupling
- Easy to test (inject mocks)
- Flexible (swap implementations)

### How NestJS Does It

1. You declare dependencies in constructor
2. NestJS looks in module's `providers` array
3. Creates instance (or reuses singleton)
4. Injects it automatically

**Example**:
```typescript
// Module
@Module({
  providers: [UserService], // ✅ Makes it available
})
export class UsersModule {}

// Controller
@Controller()
export class UserController {
  constructor(private userService: UserService) {} // ✅ Injected!
}
```

## 2. Modules

### What They Are

Modules are containers that organize related code together.

### Why They Matter

- **Organization**: Group related functionality
- **Encapsulation**: Control what's exposed
- **Reusability**: Import modules where needed

### Module Structure

```typescript
@Module({
  imports: [OtherModule],      // What this module needs
  controllers: [MyController], // Route handlers
  providers: [MyService],      // Services, guards, etc.
  exports: [MyService],        // What others can use
})
export class MyModule {}
```

### Module Types

1. **Feature Modules**: Organize features (UsersModule, AuthModule)
2. **Shared Modules**: Reusable across features
3. **Global Modules**: Available everywhere (`@Global()`)

## 3. Prisma Models

### What They Are

Prisma models are schema definitions that represent database tables. They're defined in `prisma/schema.prisma`.

### Why They Matter

- **Type Safety**: Prisma generates TypeScript types automatically
- **No Raw SQL**: Work with objects, not strings
- **Migrations**: Version control for schema
- **Auto-Generated Client**: Prisma generates type-safe query methods

### Model Structure

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Schema Syntax Explained

- `model User`: Defines a database table named `User`
- `@id`: Marks field as primary key
- `@default(uuid())`: Auto-generates UUID value
- `@unique`: Ensures no duplicate values
- `@default(now())`: Auto-sets current timestamp on creation
- `@updatedAt`: Auto-updates timestamp on change
- `String?`: Optional field (nullable)

## 4. Prisma Client

### What It Is

Prisma Client is an auto-generated, type-safe database client that provides methods to interact with your database.

### Why It Matters

- **Abstraction**: Don't write SQL directly
- **Type Safety**: Fully typed with autocomplete
- **Auto-Generated**: Generated from your Prisma schema
- **Methods**: `findMany()`, `findUnique()`, `create()`, `update()`, `delete()`, etc.

### Using Prisma Client

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany(); // ✅ Type-safe with autocomplete!
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: { email: string; password: string }) {
    return this.prisma.user.create({ data });
  }
}
```

### PrismaService Pattern

PrismaService extends PrismaClient and manages the connection lifecycle:

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## 5. Docker Containers

### What They Are

Containers are isolated environments that run applications.

### Why They Matter

- **Consistency**: Same environment everywhere
- **Isolation**: Doesn't affect your system
- **Easy Cleanup**: Delete when done

### Docker Compose

Defines multiple containers in one file:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
```

**Benefits**:
- One command to start everything
- Shared network between containers
- Easy to share with team

## 6. Environment Variables

### What They Are

Configuration values stored outside code.

### Why They Matter

- **Security**: Secrets not in code
- **Flexibility**: Different values per environment
- **No Commits**: Never commit secrets to git

### Using in NestJS

```typescript
// .env file
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
JWT_SECRET=secret

// In code
config.get('DATABASE_URL') // ✅ Reads from .env
```

## Key Principles

1. **Separation of Concerns**: Each class has one job
2. **Dependency Injection**: Don't create dependencies, receive them
3. **Type Safety**: Use TypeScript types everywhere
4. **Configuration**: Use environment variables
5. **Isolation**: Use Docker for dependencies

## Common Patterns

### Pattern: Service Uses PrismaService

```typescript
@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}
}
```

### Pattern: Controller Uses Service

```typescript
@Controller()
export class MyController {
  constructor(private myService: MyService) {}
}
```

### Pattern: Module Wires Everything

```typescript
@Module({
  imports: [PrismaModule], // PrismaService available (global)
  controllers: [MyController],
  providers: [MyService],
})
export class MyModule {}
```

## Next Steps

Now that you understand these concepts, you're ready to build authentication features in the next lessons!
