import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import bcrypt from "bcrypt"

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}

    async register(dto: RegisterDto) {
        const candidate = await this.prisma.user.findUnique({ where: { email: dto.email } })
        if (candidate) {
            throw new ConflictException("Пользователь с таким email уже существует")
        }

        const passwordHash = await bcrypt.hash(dto.password, 10)

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                firstname: dto.firstname,
                lastname: dto.lastname
            }
        })

        const { passwordHash: _, ...result } = user
        return result
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
        if (!user) {
            throw new UnauthorizedException("Неверный email или пароль")
        }
        
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
        if (!isPasswordValid) {
            throw new UnauthorizedException("Неверный email или пароль")
        }

        const { passwordHash: _, ...result } = user
        return result
    }
}
