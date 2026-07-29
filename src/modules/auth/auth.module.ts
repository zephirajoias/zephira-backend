import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleUserOAuthGuard } from './guards/google-user-oauth.guard';
import { UserJwtGuard } from './guards/user-jwt.guard';
import { GoogleUserStrategy } from './strategies/google-user.strategy';
import { UserJwtStrategy } from './strategies/user-jwt.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleUserStrategy,
    UserJwtStrategy,
    GoogleUserOAuthGuard,
    UserJwtGuard,
  ],
  exports: [AuthService, UserJwtGuard],
})
export class AuthModule {}
