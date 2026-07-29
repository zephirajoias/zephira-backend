import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USUARIO } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { LoginUserDto, RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient<any, any, any>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );
  }

  async findOrCreateGoogleUser(profile: {
    email: string;
    name: string;
  }): Promise<USUARIO> {
    let user = await this.prismaService.uSUARIO.findUnique({
      where: { DS_EMAIL: profile.email },
    });

    if (!user) {
      const { data: authData } = await this.supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        user_metadata: { full_name: profile.name },
      });

      user = await this.prismaService.uSUARIO.create({
        data: {
          NM_USUARIO: profile.name,
          DS_EMAIL: profile.email,
          DS_SENHA_HASH: '',
          TP_PERFIL: 'USUARIO',
          CD_AUTH_SUPABASE: authData?.user?.id ?? null,
          TS_CRIACAO: new Date(),
          TS_ATUALIZACAO: new Date(),
        },
      });
    } else if (!user.CD_AUTH_SUPABASE) {
      const { data: authData } = await this.supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
      });

      if (authData?.user) {
        await this.prismaService.uSUARIO.update({
          where: { CD_USUARIO: user.CD_USUARIO },
          data: { CD_AUTH_SUPABASE: authData.user.id },
        });
        user = { ...user, CD_AUTH_SUPABASE: authData.user.id };
      }
    }

    return user;
  }

  async register(dto: RegisterUserDto): Promise<USUARIO> {
    const usuarioExistente = await this.prismaService.uSUARIO.findUnique({
      where: { DS_EMAIL: dto.DS_EMAIL },
    });

    if (usuarioExistente) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const hashSenha = await bcrypt.hash(dto.DS_SENHA, 10);

    return this.prismaService.uSUARIO.create({
      data: {
        NM_USUARIO: dto.NM_USUARIO,
        DS_EMAIL: dto.DS_EMAIL,
        DS_SENHA_HASH: hashSenha,
        TP_PERFIL: 'USUARIO',
        NR_TELEFONE: dto.NR_TELEFONE,
        TS_CRIACAO: new Date(),
        TS_ATUALIZACAO: new Date(),
      },
    });
  }

  async login(dto: LoginUserDto): Promise<any> {
    const user = await this.prismaService.uSUARIO.findUnique({
      where: { DS_EMAIL: dto.DS_EMAIL },
    });

    if (!user || !user.DS_SENHA_HASH) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(dto.DS_SENHA, user.DS_SENHA_HASH);

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.generateUserToken(user);
  }

  generateUserToken(user: USUARIO) {
    const payload = {
      sub: user.CD_USUARIO,
      email: user.DS_EMAIL,
      roles: user.TP_PERFIL,
      name: user.NM_USUARIO,
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    const decoded: any = this.jwtService.decode(access_token);

    return {
      access_token,
      expires_at: decoded.exp,
      user: {
        id: user.CD_USUARIO,
        name: user.NM_USUARIO,
        email: user.DS_EMAIL,
      },
    };
  }
}
