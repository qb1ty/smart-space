import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>()

        if (!req.session || req.session.role !== "ADMIN") {
            throw new ForbiddenException("Вы не являетесь админом")
        }

        if (!req.session.isActive) {
            throw new ForbiddenException("Вам запрещен доступ к использованию")
        }

        return true
    }
}