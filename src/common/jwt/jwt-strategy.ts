import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const publicKey = configService.get<string>('jwt.publicKey');

    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY não definida no ambiente!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
