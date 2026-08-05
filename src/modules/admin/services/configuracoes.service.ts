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
    const dados = {
      NM_LOJA: dto.NM_LOJA,
      DS_EMAIL_SUPORTE: dto.DS_EMAIL_SUPORTE,
      NR_TELEFONE: dto.NR_TELEFONE,
      SG_MOEDA: dto.SG_MOEDA,
      DS_FUSO_HORARIO: dto.DS_FUSO_HORARIO,
      NM_REMETENTE: dto.NM_REMETENTE,
      NR_CEP_REMETENTE: dto.NR_CEP_REMETENTE?.replace(/\D/g, ''),
      DS_ENDERECO_REMETENTE: dto.DS_ENDERECO_REMETENTE,
      NR_NUMERO_REMETENTE: dto.NR_NUMERO_REMETENTE,
      NM_BAIRRO_REMETENTE: dto.NM_BAIRRO_REMETENTE,
      NM_CIDADE_REMETENTE: dto.NM_CIDADE_REMETENTE,
      DS_UF_REMETENTE: dto.DS_UF_REMETENTE?.toUpperCase(),
      NR_PACOTE_ALTURA: dto.NR_PACOTE_ALTURA,
      NR_PACOTE_LARGURA: dto.NR_PACOTE_LARGURA,
      NR_PACOTE_COMPRIMENTO: dto.NR_PACOTE_COMPRIMENTO,
      NR_PACOTE_PESO: dto.NR_PACOTE_PESO,
      TS_ATUALIZACAO: new Date(),
    };

    return this.prismaService.cONFIGURACOES_LOJA.upsert({
      where: { CD_CONFIGURACAO: 1 },
      update: dados,
      create: { CD_CONFIGURACAO: 1, ...dados },
    });
  }
}
