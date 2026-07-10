import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export const SessionInfo = createParamDecorator(
    (_: unknown, ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest<Request>()
        
        return {
            userId: req.session.userId,
            role: req.session.role
        }
    }
)