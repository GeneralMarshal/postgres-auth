import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  name?: string;
  role?: string;
}

@Injectable()
export class AuthJwtService {
  constructor(private jwtService: JwtService) {}

  async generateToken(
    userId: string,
    email: string,
    name?: string,
    role?: string,
  ) {
    const tokenId = randomBytes(16).toString('hex');
    const payload: JwtPayload = {
      sub: userId,
      email: email,
      jti: tokenId,
      ...(name && { name }),
      ...(role && { role }),
    };

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
