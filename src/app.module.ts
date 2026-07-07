import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpacesModule } from './spaces/spaces.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, SpacesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
