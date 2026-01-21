import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Se o token for inválido, expirado ou não existir
    if (err || !user) {
      throw err || new UnauthorizedException('Acesso administrativo negado.');
    }

    // Verificação de segurança extra: garante que a role é admin
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        'Você não tem privilégios de administrador.',
      );
    }

    return user;
  }
}
