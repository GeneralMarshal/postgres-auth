import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthJwtService } from '../jwt/jwt.service';
import { SessionService } from './session.service';

@Injectable()
export class SessionValidatorService {
  constructor(
    private jwtService: AuthJwtService,
    private sessionService: SessionService,
  ) {}

  async validateTokenAndSession(token: string): Promise<string> {
    const payload = await this.jwtService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // extract the token id
    const tokenId = this.jwtService.getTokenId(payload);
    if (!tokenId) {
      throw new UnauthorizedException('Token missing identifier');
    }

    // up next check if token exitsts in redis
    const sessionExists = await this.sessionService.sessionExists(tokenId);
    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return payload.sub;
  }
}
