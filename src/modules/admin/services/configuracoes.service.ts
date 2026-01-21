import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { UpdateConfiguracoesDto } from '../dto/update-configuracoes.dto';

@Injectable()
export class ConfiguracoesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getConfiguracoesGerais(): Promise<any> {
    const config = await this.prismaService.cONFIGURACOES_LOJA.findFirst();
    return config;
  }

  async updateConfiguracoesGerais(dto: UpdateConfiguracoesDto): Promise<any> {
    const config = await this.prismaService.cONFIGURACOES_LOJA.upsert({
      where: { CD_CONFIGURACAO: 1 },
      update: {
        NM_LOJA: dto.NM_LOJA,
        DS_EMAIL_SUPORTE: dto.DS_EMAIL_SUPORTE,
        NR_TELEFONE: dto.NR_TELEFONE,
        SG_MOEDA: dto.SG_MOEDA,
        DS_FUSO_HORARIO: dto.DS_FUSO_HORARIO,
      },
      create: {
        CD_CONFIGURACAO: 1,
        NM_LOJA: dto.NM_LOJA,
        DS_EMAIL_SUPORTE: dto.DS_EMAIL_SUPORTE,
        NR_TELEFONE: dto.NR_TELEFONE,
        SG_MOEDA: dto.SG_MOEDA,
        DS_FUSO_HORARIO: dto.DS_FUSO_HORARIO,
      },
    });

    return config;
  }
}
