import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { lerChavePublica } from 'src/common/chaves-jwt';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    const publicKey = lerChavePublica();

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        AdminJwtStrategy.extractJWTFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  private static extractJWTFromCookie(req: Request): string | null {
    if (req.cookies && 'zephira-token' in req.cookies) {
      return req.cookies['zephira-token'];
    }
    return null;
  }

  async validate(payload: any) {
    if (!payload || payload.roles !== 'ADMIN') {
      throw new UnauthorizedException('Acesso negado.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.roles,
      exp: payload.exp,
    };
  }
}
