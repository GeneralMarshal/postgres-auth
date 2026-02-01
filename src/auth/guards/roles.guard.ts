import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from 'src/common/decorators/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Extract user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // if no user, deny access
    if (!user) {
      return false;
    }

    // Check if user's role matches any required role (enum comparison)
    return requiredRoles.some((role) => user.role === role);
  }
}
