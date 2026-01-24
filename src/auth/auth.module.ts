import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthJwtService } from './services/jwt/jwt.service';
import { CommonModule } from 'src/common/common.module';
import { SessionService } from './services/session/session.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Module({
  imports: [
    PassportModule,
    CommonModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '1h');
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthJwtService, SessionService, JwtStrategy, JwtAuthGuard],
  exports: [
    JwtModule,
    AuthJwtService,
    SessionService,
    PassportModule,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
