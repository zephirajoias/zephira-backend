import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { CreatePromocoesDto } from '../dto/create-promocoes.dto';
import { UpdatePromocoesDto } from '../dto/update-promocao.dto';

@Injectable()
export class PromocoesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createPromocao(dto: CreatePromocoesDto): Promise<any> {
    const promocao = await this.prismaService.pROMOCOES.create({
      data: {
        NM_PROMOCAO: dto.NM_PROMOCAO,
        VL_DESCONTO: dto.VL_DESCONTO,
        DT_INICIO: dto.DT_INICIO,
        DT_FIM: dto.DT_FIM,
        VL_PEDIDO_MINIMO: dto.VL_PEDIDO_MINIMO,
        TP_PROMOCAO: dto.TP_PROMOCAO,
        DS_CODIGO: dto.DS_CODIGO,
        SN_ATIVO: dto.SN_ATIVO,
        TS_CRIACAO: new Date(),
      },
    });

    return promocao;
  }

  async listaPromocoes(): Promise<any> {
    const promocoes = await this.prismaService.pROMOCOES.findMany();
    return promocoes;
  }

  async listaTiposPromocoes(): Promise<any> {
    const tipos = await this.prismaService.$queryRawUnsafe(
      `SELECT unnest(enum_range(NULL::"Zephira"."TYPE_PROMOCAO"));`,
    );
    return tipos;
  }

  async editaPromocao(
    dto: UpdatePromocoesDto,
    promocaoId: number,
  ): Promise<any> {
    const promocao = await this.prismaService.pROMOCOES.update({
      where: { CD_PROMOCAO: Number(promocaoId) },
      data: {
        NM_PROMOCAO: dto.NM_PROMOCAO,
        VL_DESCONTO: dto.VL_DESCONTO,
        SN_ATIVO: Number(dto.SN_ATIVO),
      },
    });

    return promocao;
  }

  async deletePromocao(promocaoId: number): Promise<any> {
    const promocao = await this.prismaService.pROMOCOES.delete({
      where: { CD_PROMOCAO: Number(promocaoId) },
    });

    return promocao;
  }
}
