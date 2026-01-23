# STEP 02: Redis Setup

**Goal**: Set up Redis connection and service in NestJS

## Prerequisites

Before we start, make sure:

- ✅ Redis container is running in Docker
- ✅ You can see Redis in `docker-compose ps`

**Check Redis is running:**

```bash
docker-compose ps
```

You should see:

```
NAME                      STATUS
auth-tutorial-redis       Up (healthy)
```

**If not running:**

```bash
docker-compose up -d redis
```

## Installing Redis Package

### 1. Install ioredis

We need `ioredis` - a robust Redis client for Node.js:

```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

**Why ioredis?**

- ✅ Full-featured Redis client
- ✅ Promise-based (works great with async/await)
- ✅ TypeScript support
- ✅ Connection pooling
- ✅ Automatic reconnection

### 2. Verify Installation

Check `package.json`:

```json
{
  "dependencies": {
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

## Environment Configuration

### Update .env File

Add Redis configuration to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password (default for Docker)
REDIS_TTL=3600   # Default TTL in seconds (1 hour)
```

**Configuration explained:**

- `REDIS_HOST`: Redis server hostname (localhost for Docker)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (empty for local Docker setup)
- `REDIS_TTL`: Default session expiration time in seconds

## Creating Redis Service

### Step 1: Create Redis Module

Create `src/common/services/redis.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  async onModuleInit() {
    // Test connection
    try {
      await this.client.ping();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Get Redis client
  getClient(): Redis {
    return this.client;
  }

  // Set a key-value pair with optional TTL
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // Get a value by key
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // Delete a key
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  // Check if key exists
  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  // Set expiration on existing key
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }
}
```

**Let's break this down:**

#### Class Structure

```typescript
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
```

- `@Injectable()`: Makes it a NestJS provider
- `OnModuleInit`: Lifecycle hook - runs when module initializes
- `OnModuleDestroy`: Lifecycle hook - runs when module destroys
- `private client: Redis`: Redis client instance

#### Constructor

```typescript
constructor(private configService: ConfigService) {
  const host = this.configService.get<string>('REDIS_HOST', 'localhost');
  const port = this.configService.get<number>('REDIS_PORT', 6379);
  const password = this.configService.get<string>('REDIS_PASSWORD');

  this.client = new Redis({
    host,
    port,
    password: password || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}
```

**Configuration:**

- Reads Redis config from environment variables
- `retryStrategy`: Automatically retries connection if it fails
- Exponential backoff (50ms, 100ms, 150ms... up to 2s)

#### Connection Lifecycle

```typescript
async onModuleInit() {
  await this.client.ping();
  console.log('✅ Redis connected successfully');
}

async onModuleDestroy() {
  await this.client.quit();
}
```

- `onModuleInit`: Tests connection when app starts
- `onModuleDestroy`: Closes connection when app shuts down

#### Helper Methods

```typescript
async set(key: string, value: string, ttl?: number): Promise<void>
async get(key: string): Promise<string | null>
async del(key: string): Promise<number>
async exists(key: string): Promise<number>
async expire(key: string, seconds: number): Promise<number>
```

These are convenience methods for common Redis operations.

### Step 2: Export RedisService from CommonModule

Update `src/common/common.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PasswordService } from './services/password.service';
import { RedisService } from './services/redis.service';

@Module({
  imports: [ConfigModule],
  providers: [PasswordService, RedisService],
  exports: [PasswordService, RedisService],
})
export class CommonModule {}
```

**What we did:**

- Added `RedisService` to `providers`
- Added `RedisService` to `exports` (so other modules can use it)
- `ConfigModule` is already imported (needed for `ConfigService`)

## Testing Redis Connection

### Step 1: Create a Test Endpoint (Optional)

Add a test endpoint in `src/app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RedisService } from './common/services/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-redis')
  async testRedis() {
    try {
      // Test set
      await this.redisService.set('test-key', 'test-value', 60);

      // Test get
      const value = await this.redisService.get('test-key');

      // Test exists
      const exists = await this.redisService.exists('test-key');

      return {
        success: true,
        message: 'Redis is working!',
        data: {
          value,
          exists: exists === 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Redis connection failed',
        error: error.message,
      };
    }
  }
}
```

**Don't forget to import CommonModule in AppModule:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';

@Module({
  imports: [ConfigModule.forRoot(), CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Step 2: Test the Connection

1. **Start your NestJS app:**

   ```bash
   npm run start:dev
   ```

2. **Check console output:**
   You should see:

   ```
   ✅ Redis connected successfully
   ```

3. **Test the endpoint:**

   ```bash
   curl http://localhost:3000/test-redis
   ```

   **Expected response:**

   ```json
   {
     "success": true,
     "message": "Redis is working!",
     "data": {
       "value": "test-value",
       "exists": true
     }
   }
   ```

## Troubleshooting

### Error: "Redis connection failed"

**Possible causes:**

1. Redis container not running

   ```bash
   docker-compose ps
   docker-compose up -d redis
   ```

2. Wrong host/port in `.env`
   - Check `REDIS_HOST=localhost`
   - Check `REDIS_PORT=6379`

3. Firewall blocking connection
   - Make sure port 6379 is accessible

### Error: "ECONNREFUSED"

**Solution:**

```bash
# Restart Redis container
docker-compose restart redis

# Check logs
docker-compose logs redis
```

## What's Next?

Now that Redis is set up, we can implement session storage:

**Next Step**: [STEP-03-session-storage.md](./STEP-03-session-storage.md)

---

## Quick Summary

✅ **Installed**: `ioredis` package
✅ **Created**: `RedisService` with connection management
✅ **Configured**: Environment variables for Redis
✅ **Tested**: Redis connection

**Key Files Created:**

- `src/common/services/redis.service.ts`
- Updated `src/common/common.module.ts`
