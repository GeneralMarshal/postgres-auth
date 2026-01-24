import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionService } from '../services/session/session.service';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  name?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const tokenId = payload.jti;
    if (!tokenId) {
      throw new UnauthorizedException('Token missing identifier');
    }

    const sessionExists = await this.sessionService.sessionExists(tokenId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tokenId: payload.jti,
    };
  }
}
