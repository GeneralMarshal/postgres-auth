import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role?: UserRole;
  tokenId?: string;
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: any }>();
    return request.user as AuthenticatedUser;
  },
);
