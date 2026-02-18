import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from 'src/common/decorators/user.decorator';

@Injectable
export class PermissionService {
  // First of check if user has required roles
  hasRole(user: AuthenticatedUser, requiredRoles: UserRole[]): boolean {
    if (!user?.role) {
      return false;
    }
    return requiredRoles.includes(user.role);
  }

  // check if user is admin
  isAdmin(user: AuthenticatedUser): boolean {
    return user?.role === UserRole.ADMIN;
  }

  // check i user owns a particular resource
  isOwner(user: AuthenticatedUser, resourceOwnerId: string): boolean {
    return user?.userId === resourceOwnerId;
  }

  //check if user can access a particular resource ( owner or admin )
  canAccess(user: AuthenticatedUser, resourceOwnerId: string): boolean {
    return this.isAdmin(user) || this.isOwner(user, resourceOwnerId);
  }

  //throw forbidden if user doesn't have role
  requireRole(user: AuthenticatedUser, requiredRoles: UserRole[]): void {
    if (!this.hasRole(user, requiredRoles)) {
      throw new ForbiddenException(
        'Access denied. Required roles: ${requiredRoles.join(',
        ')}',
      );
    }
  }

  //throw forbidden if user is not admin
  requireAdmin(user: AuthenticatedUser): void {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }
  }

  //throw forbidden if user doesn't own resource
  requireOwnership(user: AuthenticatedUser, resourceOwnerId: string): void {
    if (!this.canAccess(user, resourceOwnerId)) {
      throw new ForbiddenException(
        'Access denied. You do not have permission to access this resource.',
      );
    }
  }

  //throw forbidden if user doesn't own resource
  
}
