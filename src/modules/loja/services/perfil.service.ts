import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { ChangePasswordDto, UpdatePerfilDto } from '../dto/update-perfil.dto';

@Injectable()
export class PerfilService {
  constructor(private readonly prismaService: PrismaService) {}

  async getPerfil(cd_usuario: number): Promise<any> {
    const user = await this.prismaService.uSUARIO.findUnique({
      where: { CD_USUARIO: cd_usuario },
      select: {
        CD_USUARIO: true,
        NM_USUARIO: true,
        DS_EMAIL: true,
        NR_TELEFONE: true,
        TS_CRIACAO: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async updatePerfil(cd_usuario: number, dto: UpdatePerfilDto): Promise<any> {
    return this.prismaService.uSUARIO.update({
      where: { CD_USUARIO: cd_usuario },
      data: {
        NM_USUARIO: dto.NM_USUARIO,
        NR_TELEFONE: dto.NR_TELEFONE,
        TS_ATUALIZACAO: new Date(),
      },
      select: {
        CD_USUARIO: true,
        NM_USUARIO: true,
        DS_EMAIL: true,
        NR_TELEFONE: true,
      },
    });
  }

  async changePassword(
    cd_usuario: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prismaService.uSUARIO.findUnique({
      where: { CD_USUARIO: cd_usuario },
    });

    if (!user || !user.DS_SENHA_HASH) {
      throw new UnauthorizedException(
        'Esta conta não possui senha cadastrada (login via Google).',
      );
    }

    const senhaValida = await bcrypt.compare(
      dto.currentPassword,
      user.DS_SENHA_HASH,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    const novaSenhaHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.uSUARIO.update({
      where: { CD_USUARIO: cd_usuario },
      data: { DS_SENHA_HASH: novaSenhaHash, TS_ATUALIZACAO: new Date() },
    });

    return { message: 'Senha atualizada com sucesso!' };
  }
}
