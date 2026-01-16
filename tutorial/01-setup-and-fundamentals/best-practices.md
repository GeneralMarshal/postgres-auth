# Best Practices

Industry standards and best practices for backend development with NestJS and Prisma.

## 1. Project Structure

### Recommended Structure

```
src/
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
└── app.module.ts
prisma/
└── schema.prisma
```

**Principles**:
- Group by feature, not by type
- Each feature has its own module
- Prisma schema in `prisma/schema.prisma`
- Clear, descriptive names

## 2. Environment Variables

### ✅ DO

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
JWT_SECRET=your-secret-key
```

```typescript
// Use ConfigService
config.get('DATABASE_URL')
```

### ❌ DON'T

```typescript
// Hardcode values
const dbHost = 'localhost'; // ❌
const jwtSecret = 'secret'; // ❌
```

**Why**:
- Secrets in code = security risk
- Can't change per environment
- Hard to manage

## 3. Prisma Configuration

### ✅ DO (Development)

```bash
npx prisma db push  # Quick schema sync for development
```

### ❌ DON'T (Production)

```bash
npx prisma db push  # ❌ Never in production!
```

**Why**:
- Can lose data
- No version control
- Use `prisma migrate` instead

### ✅ DO (Production)

```bash
npx prisma migrate dev --name migration_name  # Create migration
npx prisma migrate deploy  # Apply migrations in production
```

**Why**:
- Version controlled
- Reviewable changes
- Rollback support

## 4. Prisma Model Design

### ✅ DO

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### ❌ DON'T

```prisma
model User {
  id    Int    // ❌ No @id decorator
  email String // ❌ No constraints
}
```

**Why**:
- Prisma schema defines database structure
- Constraints ensure data integrity
- Prisma needs proper schema syntax to work

## 5. Dependency Injection

### ✅ DO

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
}
```

### ❌ DON'T

```typescript
export class UserService {
  private prisma = new PrismaClient(); // ❌
}
```

**Why**:
- Can't test easily
- Tightly coupled
- NestJS can't manage lifecycle
- Multiple connections (wasteful)

## 6. Error Handling

### ✅ DO

```typescript
async findOne(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  return user;
}
```

### ❌ DON'T

```typescript
async findOne(id: string) {
  return this.prisma.user.findUnique({ where: { id } }); // ❌ Might return null
}
```

**Why**:
- Explicit error handling
- Better user experience
- Easier debugging

## 7. Validation

### ✅ DO

```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(8)
  @IsNotEmpty()
  password: string;
}
```

### ❌ DON'T

```typescript
export class CreateUserDto {
  email: string; // ❌ No validation
  password: string; // ❌ No validation
}
```

**Why**:
- Prevents invalid data
- Better security
- Clear error messages

## 8. Security

### ✅ DO

- Hash passwords (bcrypt)
- Use environment variables for secrets
- Validate all input
- Use HTTPS in production
- Rate limiting

### ❌ DON'T

- Store plaintext passwords
- Commit secrets to git
- Trust user input
- Expose sensitive data

## 9. Code Organization

### ✅ DO

- One responsibility per class
- Small, focused methods
- Clear naming
- Comments for complex logic

### ❌ DON'T

- God classes (do everything)
- Long methods
- Unclear names
- Comments for obvious code

## 10. Testing

### ✅ DO

- Test business logic
- Use dependency injection for mocks
- Test error cases
- Keep tests simple

### ❌ DON'T

- Test framework code
- Test implementation details
- Skip error cases
- Over-complicate tests

## Common Mistakes to Avoid

### 1. Forgetting @Injectable()

```typescript
export class UserService { // ❌ Missing @Injectable()
  // ...
}
```

**Fix**:
```typescript
@Injectable()
export class UserService { // ✅
  // ...
}
```

### 2. Not Exporting from Module

```typescript
@Module({
  providers: [UserService], // ❌ Not exported
})
```

**Fix**:
```typescript
@Module({
  providers: [UserService],
  exports: [UserService], // ✅
})
```

### 3. Using db push in Production

```bash
npx prisma db push  # ❌ In production
```

**Fix**: Use `prisma migrate` instead

### 4. Hardcoding Values

```typescript
const databaseUrl = 'postgresql://...'; // ❌
```

**Fix**: Use environment variables (DATABASE_URL)

### 5. No Input Validation

```typescript
create(@Body() dto: any) { // ❌
  // ...
}
```

**Fix**: Use DTOs with validation

## Summary

- ✅ Use environment variables
- ✅ Follow project structure
- ✅ Use dependency injection
- ✅ Validate input
- ✅ Handle errors
- ✅ Security first
- ✅ Test your code
- ❌ Don't hardcode values
- ❌ Don't use db push in production
- ❌ Don't skip validation

Follow these practices and your code will be maintainable, secure, and production-ready!
