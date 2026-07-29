import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleUserStrategy extends PassportStrategy(
  Strategy,
  'google-user',
) {
  private static readonly logger = new Logger(GoogleUserStrategy.name);
  private readonly isConfigured: boolean;

  constructor(private readonly authService: AuthService) {
    const isConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CALLBACK_URL_USER,
    );

    if (!isConfigured) {
      GoogleUserStrategy.logger.warn(
        'Login com Google (cliente) desabilitado: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_CALLBACK_URL_USER não configurados.',
      );
    }

    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
      callbackURL: process.env.GOOGLE_CALLBACK_URL_USER || 'http://localhost/not-configured',
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
    const name = profile.displayName ?? profile.emails?.[0]?.value;

    try {
      const user = await this.authService.findOrCreateGoogleUser({ email, name });
      done(null, user);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
