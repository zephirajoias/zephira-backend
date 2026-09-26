import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import sharp from 'sharp';
import { supabaseAdmin } from 'src/common/supabase/supabase.provider';
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

  async uploadImagemMarca(
    tipo: 'logo' | 'favicon',
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const tamanho = tipo === 'favicon' ? 256 : 512;

    const buffer = await sharp(file.buffer)
      .resize(tamanho, tamanho, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const fileName = `config/${tipo}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('imagens-produtos')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      throw new InternalServerErrorException(
        `Falha no upload do ${tipo === 'favicon' ? 'favicon' : 'logo'}.`,
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('imagens-produtos').getPublicUrl(fileName);

    const campo = tipo === 'favicon' ? 'DS_URL_FAVICON' : 'DS_URL_LOGO';

    await this.prismaService.cONFIGURACOES_LOJA.upsert({
      where: { CD_CONFIGURACAO: 1 },
      update: { [campo]: publicUrl, TS_ATUALIZACAO: new Date() },
      create: {
        CD_CONFIGURACAO: 1,
        NM_LOJA: 'Zephira Joias',
        [campo]: publicUrl,
      },
    });

    return { url: publicUrl };
  }

  // Sem autenticação de propósito — precisa ser lido pelo <head> da loja e
  // do admin (favicon/nome aparecem antes de qualquer login).
  async getConfiguracoesPublicas(): Promise<any> {
    const config = await this.prismaService.cONFIGURACOES_LOJA.findUnique({
      where: { CD_CONFIGURACAO: 1 },
      select: {
        NM_LOJA: true,
        DS_URL_LOGO: true,
        DS_URL_FAVICON: true,
        // Contato aparece no rodapé e nas páginas institucionais da loja.
        NR_TELEFONE: true,
        DS_EMAIL_SUPORTE: true,
      },
    });

    return (
      config ?? {
        NM_LOJA: null,
        DS_URL_LOGO: null,
        DS_URL_FAVICON: null,
        NR_TELEFONE: null,
        DS_EMAIL_SUPORTE: null,
      }
    );
  }
}
