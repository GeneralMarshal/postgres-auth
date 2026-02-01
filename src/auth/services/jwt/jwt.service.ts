import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: UserRole;
  jti?: string;
  name?: string;
  iat: number;
}

@Injectable()
export class AuthJwtService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateToken(
    userId: string,
    email: string,
    name?: string,
    role?: UserRole,
  ) {
    const tokenId = randomBytes(16).toString('hex');
    const payload: JwtPayload = {
      sub: userId,
      email,
      jti: tokenId,
      ...(name && { name }),
      ...(role && { role }),
      iat: Math.floor(Date.now() / 1000),
    } as JwtPayload;

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      tokenId,
    };
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      return null;
    }
  }

  getTokenId(payload: JwtPayload) {
    return payload.jti || null;
  }
}
