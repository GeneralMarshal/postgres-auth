import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/common/services/redis.service';

export interface SessionData {
  userId: string;
  email: string;
  createdAt: string;
}

@Injectable()
export class SessionService {
  private readonly sessionPrefix = 'session:';
  private readonly defaultTTL: number;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    // Get TTL from config or default to 1 hour (3600 seconds)
    const ttlFromConfig = this.configService.get<string>('REDIS_TTL');
    const parsedTtl = ttlFromConfig ? Number(ttlFromConfig) : NaN;
    this.defaultTTL = Number.isFinite(parsedTtl) ? parsedTtl : 3600;
  }

  // create or get session key
  private getSessionKey(tokenId: string): string {
    return `${this.sessionPrefix}${tokenId}`;
  }

  async createSession(
    tokenId: string,
    sessionData: SessionData,
    ttl?: number,
  ): Promise<void> {
    const key = this.getSessionKey(tokenId);
    const value = JSON.stringify(sessionData);
    const sessionTTL = ttl || this.defaultTTL;

    await this.redisService.set(key, value, sessionTTL);
  }

  async getSession(tokenId: string) {
    const key = this.getSessionKey(tokenId);
    const value = await this.redisService.get(key);

    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as SessionData;
    } catch {
      return null;
    }
  }

  async sessionExists(tokenId: string) {
    const key = this.getSessionKey(tokenId);
    return await this.redisService.exists(key);
  }

  async refreshSession(tokenId: string, ttl?: number): Promise<void> {
    const key = this.getSessionKey(tokenId);
    const sessionTTL = ttl || this.defaultTTL;
    await this.redisService.expire(key, sessionTTL);
  }
}
