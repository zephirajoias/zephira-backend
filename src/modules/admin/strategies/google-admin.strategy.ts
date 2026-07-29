import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AdminService } from '../services/admin.service';

@Injectable()
export class GoogleAdminStrategy extends PassportStrategy(
  Strategy,
  'google-admin',
) {
  private static readonly logger = new Logger(GoogleAdminStrategy.name);
  private readonly isConfigured: boolean;

  constructor(private readonly adminService: AdminService) {
    const isConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CALLBACK_URL_ADMIN,
    );

    if (!isConfigured) {
      GoogleAdminStrategy.logger.warn(
        'Login com Google (admin) desabilitado: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_CALLBACK_URL_ADMIN não configurados.',
      );
    }

    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
      callbackURL: process.env.GOOGLE_CALLBACK_URL_ADMIN || 'http://localhost/not-configured',
      scope: ['email', 'profile'],
    });

    this.isConfigured = isConfigured;
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    if (!this.isConfigured) {
      return done(new Error('Login com Google não está configurado.'), false);
    }

    const email = profile.emails?.[0]?.value;

    if (!email) {
      return done(
        new UnauthorizedException(
          'Email não encontrado no perfil Google.',
        ),
        false,
      );
    }

    try {
      const user = await this.adminService.findAdminByEmail(email);
      done(null, user);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
