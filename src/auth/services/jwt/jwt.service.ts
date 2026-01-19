import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  email: string;
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
    const payload: JwtPayload = {
      sub: userId,
      email: email,
      ...(name && { name }),
      ...(role && { role }),
    };

    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (error) {
      return null;
    }
  }
}
