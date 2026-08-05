import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { CreateEnderecoDto } from '../dto/create-endereco.dto';
import { UpdateEnderecoDto } from '../dto/update-endereco.dto';

@Injectable()
export class EnderecosService {
  constructor(private readonly prismaService: PrismaService) {}

  async listaEnderecos(cd_usuario: number): Promise<any[]> {
    return this.prismaService.eNDERECO.findMany({
      where: { CD_USUARIO: cd_usuario },
      orderBy: { TS_CRIACAO: 'desc' },
    });
  }

  async createEndereco(
    cd_usuario: number,
    dto: CreateEnderecoDto,
  ): Promise<any> {
    return this.prismaService.eNDERECO.create({
      data: {
        CD_USUARIO: cd_usuario,
        NR_CEP: dto.NR_CEP,
        NM_LOGRADOURO: dto.NM_LOGRADOURO,
        NR_NUMERO: dto.NR_NUMERO,
        DS_COMPLEMENTO: dto.DS_COMPLEMENTO ?? '',
        NM_BAIRRO: dto.NM_BAIRRO,
        NM_CIDADE: dto.NM_CIDADE,
        DS_UF: dto.DS_UF.toUpperCase(),
        DS_DOCUMENTO: dto.DS_DOCUMENTO?.replace(/\D/g, ''),
      },
    });
  }

  async updateEndereco(
    cd_usuario: number,
    cd_endereco: number,
    dto: UpdateEnderecoDto,
  ): Promise<any> {
    await this.garanteQueEhDono(cd_usuario, cd_endereco);

    return this.prismaService.eNDERECO.update({
      where: { CD_ENDERECO: cd_endereco },
      data: {
        NR_CEP: dto.NR_CEP,
        NM_LOGRADOURO: dto.NM_LOGRADOURO,
        NR_NUMERO: dto.NR_NUMERO,
        DS_COMPLEMENTO: dto.DS_COMPLEMENTO,
        NM_BAIRRO: dto.NM_BAIRRO,
        NM_CIDADE: dto.NM_CIDADE,
        DS_UF: dto.DS_UF?.toUpperCase(),
        DS_DOCUMENTO: dto.DS_DOCUMENTO?.replace(/\D/g, ''),
      },
    });
  }

  async deleteEndereco(cd_usuario: number, cd_endereco: number): Promise<any> {
    await this.garanteQueEhDono(cd_usuario, cd_endereco);

    return this.prismaService.eNDERECO.delete({
      where: { CD_ENDERECO: cd_endereco },
    });
  }

  private async garanteQueEhDono(
    cd_usuario: number,
    cd_endereco: number,
  ): Promise<void> {
    const endereco = await this.prismaService.eNDERECO.findUnique({
      where: { CD_ENDERECO: cd_endereco },
    });

    if (!endereco) {
      throw new NotFoundException('Endereço não encontrado.');
    }

    if (endereco.CD_USUARIO !== cd_usuario) {
      throw new ForbiddenException('Esse endereço não pertence a você.');
    }
  }
}
