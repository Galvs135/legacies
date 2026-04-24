import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RequestUser } from "./auth.types";
import { ROLES_KEY } from "./roles.decorator";
import { UserRole } from "./types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException("User not available on request.");
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient role.");
    }
    return true;
  }
}
