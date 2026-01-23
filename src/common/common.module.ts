import { Module } from '@nestjs/common';
import { PasswordService } from './services/password.service';
import { RedisService } from './services/redis.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [PasswordService, RedisService],
  exports: [PasswordService, RedisService],
})
export class CommonModule {}
