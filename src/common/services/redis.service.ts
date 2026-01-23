import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

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

  // Get redis client
  getClient(): Redis {
    return this.client;
  }

  // set a key value pair with optionla Ttl
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // get a value by the key
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // delete a key
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  //check if key exists
  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  // set expiration on existing key
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }
}
