import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginUserDto, RegisterUserDto } from './dto/register-user.dto';
import { GoogleUserOAuthGuard } from './guards/google-user-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterUserDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const user = await this.authService.register(dto);
      const tokenData = this.authService.generateUserToken(user);

      res.cookie('zephira-user-token', tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json(tokenData);
    } catch (err) {
      console.log(err);
      return res.status(409).json(err);
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginUserDto, @Res() res: Response): Promise<any> {
    try {
      const tokenData = await this.authService.login(dto);

      res.cookie('zephira-user-token', tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json(tokenData);
    } catch (err) {
      console.log(err);
      return res.status(401).json(err);
    }
  }

  @Post('logout')
  async logout(@Res() res: Response): Promise<any> {
    res.clearCookie('zephira-user-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
  }

  @Get('google')
  @UseGuards(GoogleUserOAuthGuard)
  async googleAuth() {
    // Passport redireciona automaticamente para o Google
  }

  @Get('google/callback')
  @UseGuards(GoogleUserOAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const tokenData = this.authService.generateUserToken(req.user);

    res.cookie('zephira-user-token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return res.redirect(
      process.env.USER_FRONTEND_URL ?? 'https://www.zephirajoias.com.br',
    );
  }
}
