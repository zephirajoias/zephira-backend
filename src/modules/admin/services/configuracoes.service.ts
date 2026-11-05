import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import sharp from 'sharp';
import { supabaseAdmin } from 'src/common/supabase/supabase.provider';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { UpdateConfiguracoesDto } from '../dto/update-configuracoes.dto';

// Campos que existem desde antes da migração de 2026-09-26 — usados como
// fallback enquanto ela não roda em produção (ver notas abaixo).
const CAMPOS_ESTAVEIS = {
  NM_LOJA: true,
  DS_EMAIL_SUPORTE: true,
  NR_TELEFONE: true,
  SG_MOEDA: true,
  DS_FUSO_HORARIO: true,
  DS_URL_LOGO: true,
  DS_URL_FAVICON: true,
  NM_REMETENTE: true,
  NR_CEP_REMETENTE: true,
  DS_ENDERECO_REMETENTE: true,
  NR_NUMERO_REMETENTE: true,
  NM_BAIRRO_REMETENTE: true,
  NM_CIDADE_REMETENTE: true,
  DS_UF_REMETENTE: true,
  NR_PACOTE_ALTURA: true,
  NR_PACOTE_LARGURA: true,
  NR_PACOTE_COMPRIMENTO: true,
  NR_PACOTE_PESO: true,
  TS_ATUALIZACAO: true,
} as const;

// Campos que só existem depois que prisma/sql/2026-09-26-melhorias.sql
// rodar no banco.
const CAMPOS_NOVOS = [
  'VL_FRETE_GRATIS_MINIMO',
  'NR_PARCELAS_SEM_JUROS',
  'NM_RAZAO_SOCIAL',
  'NR_CNPJ',
  'DS_ENDERECO_LOJA',
  'DS_INSTAGRAM',
  'DS_TEXTO_RODAPE',
] as const;

@Injectable()
export class ConfiguracoesService {
  private readonly logger = new Logger(ConfiguracoesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getConfiguracoesGerais(): Promise<any> {
    try {
      return await this.prismaService.cONFIGURACOES_LOJA.findFirst();
    } catch (err) {
      // findFirst() sem select pega todas as colunas do model do Prisma,
      // inclusive as que a migração de 2026-09-26 ainda não criou no banco.
      // Sem isso, a tela de Configurações Gerais nem abre enquanto a
      // migração não roda.
      this.logger.error(
        `getConfiguracoesGerais com todas as colunas falhou (migração pendente?), caindo pros campos estáveis: ${err}`,
      );
      return this.prismaService.cONFIGURACOES_LOJA.findFirst({
        select: CAMPOS_ESTAVEIS,
      });
    }
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
      // null (não undefined) apaga o valor quando o campo é esvaziado no
      // admin — undefined faria o Prisma simplesmente ignorar o campo.
      VL_FRETE_GRATIS_MINIMO: dto.VL_FRETE_GRATIS_MINIMO ?? null,
      NR_PARCELAS_SEM_JUROS: dto.NR_PARCELAS_SEM_JUROS ?? null,
      NM_RAZAO_SOCIAL: dto.NM_RAZAO_SOCIAL,
      NR_CNPJ: dto.NR_CNPJ,
      DS_ENDERECO_LOJA: dto.DS_ENDERECO_LOJA,
      DS_INSTAGRAM: dto.DS_INSTAGRAM,
      DS_TEXTO_RODAPE: dto.DS_TEXTO_RODAPE,
      TS_ATUALIZACAO: new Date(),
    };

    try {
      return await this.prismaService.cONFIGURACOES_LOJA.upsert({
        where: { CD_CONFIGURACAO: 1 },
        update: dados,
        create: { CD_CONFIGURACAO: 1, ...dados },
      });
    } catch (err) {
      // Enquanto a migração de 2026-09-26 não roda, essas 6 colunas não
      // existem: salva o resto (nome, e-mail, remetente, pacote...) em vez
      // de perder o formulário inteiro, e avisa que esses campos ficaram
      // de fora (ver settings_geral/page.tsx, que mostra isso num toast).
      this.logger.error(
        `updateConfiguracoesGerais com os campos novos falhou (migração pendente?), salvando só os estáveis: ${err}`,
      );
      const dadosEstaveis = { ...dados };
      for (const campo of CAMPOS_NOVOS) delete (dadosEstaveis as any)[campo];

      // select explícito é obrigatório aqui: sem ele, o upsert tenta devolver
      // todas as colunas do model (inclusive as novas, que não existem no
      // banco ainda) pra montar o retorno — e falha de novo mesmo só
      // atualizando os campos estáveis.
      const salvo = await this.prismaService.cONFIGURACOES_LOJA.upsert({
        where: { CD_CONFIGURACAO: 1 },
        update: dadosEstaveis,
        create: { CD_CONFIGURACAO: 1, ...dadosEstaveis },
        select: CAMPOS_ESTAVEIS,
      });
      return { ...salvo, _migracaoPendente: true };
    }
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

    // select explícito pelo mesmo motivo do fallback de
    // updateConfiguracoesGerais: sem ele, o upsert tenta devolver as
    // colunas novas (migração pendente) e falha mesmo só trocando a URL
    // do logo/favicon.
    await this.prismaService.cONFIGURACOES_LOJA.upsert({
      where: { CD_CONFIGURACAO: 1 },
      update: { [campo]: publicUrl, TS_ATUALIZACAO: new Date() },
      create: {
        CD_CONFIGURACAO: 1,
        NM_LOJA: 'Zephira Joias',
        [campo]: publicUrl,
      },
      select: CAMPOS_ESTAVEIS,
    });

    return { url: publicUrl };
  }

  // Banner do topo e as 2 fotos de "Combinações Perfeitas" da home — antes
  // fixas no código do e-commerce (fotos de banco de imagem). Colunas da
  // migração 2026-11-05-home-editavel.sql: se ainda não rodou, o upload
  // falha com uma mensagem clara em vez de 500 genérico.
  async uploadImagemHome(
    tipo: 'banner_home' | 'combinacao_1' | 'combinacao_2',
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    // Banner é bem mais largo que as fotos de Combinações.
    const largura = tipo === 'banner_home' ? 2000 : 900;

    const buffer = await sharp(file.buffer)
      .resize(largura, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const fileName = `config/${tipo}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('imagens-produtos')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      throw new InternalServerErrorException('Falha no upload da imagem.');
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('imagens-produtos').getPublicUrl(fileName);

    const campo =
      tipo === 'banner_home'
        ? 'DS_URL_BANNER_HOME'
        : tipo === 'combinacao_1'
          ? 'DS_URL_FOTO_COMBINACAO_1'
          : 'DS_URL_FOTO_COMBINACAO_2';

    try {
      await this.prismaService.cONFIGURACOES_LOJA.upsert({
        where: { CD_CONFIGURACAO: 1 },
        update: { [campo]: publicUrl, TS_ATUALIZACAO: new Date() },
        create: {
          CD_CONFIGURACAO: 1,
          NM_LOJA: 'Zephira Joias',
          [campo]: publicUrl,
        },
        select: CAMPOS_ESTAVEIS,
      });
    } catch (err) {
      this.logger.error(`uploadImagemHome (${tipo}) falhou: ${err}`);
      throw new BadRequestException(
        'Essa imagem depende de uma atualização do sistema que ainda não rodou. Avise o Gustavo.',
      );
    }

    return { url: publicUrl };
  }

  // Sem autenticação de propósito — precisa ser lido pelo <head> da loja e
  // do admin (favicon/nome aparecem antes de qualquer login). É o endpoint
  // mais crítico de todos (logo, favicon, telefone, e-mail): se um campo
  // novo ainda não existir no banco (migração pendente), cai pros campos
  // estáveis em vez de devolver 500 — nunca pode tirar o site do ar por
  // causa de uma coluna que falta.
  async getConfiguracoesPublicas(): Promise<any> {
    let config: any;
    try {
      config = await this.prismaService.cONFIGURACOES_LOJA.findUnique({
        where: { CD_CONFIGURACAO: 1 },
        select: {
          NM_LOJA: true,
          DS_URL_LOGO: true,
          DS_URL_FAVICON: true,
          // Contato aparece no rodapé e nas páginas institucionais da loja.
          NR_TELEFONE: true,
          DS_EMAIL_SUPORTE: true,
          // Barra de avisos da home e dados da empresa (rodapé/Fale
          // Conosco). Colunas da migração de 2026-09-26.
          VL_FRETE_GRATIS_MINIMO: true,
          NR_PARCELAS_SEM_JUROS: true,
          NM_RAZAO_SOCIAL: true,
          NR_CNPJ: true,
          DS_ENDERECO_LOJA: true,
          DS_INSTAGRAM: true,
          // Banner/Combinações/rodapé da home. Migração
          // 2026-11-05-home-editavel.sql.
          DS_URL_BANNER_HOME: true,
          DS_URL_FOTO_COMBINACAO_1: true,
          DS_URL_FOTO_COMBINACAO_2: true,
          DS_TEXTO_RODAPE: true,
        },
      });
    } catch (err) {
      this.logger.error(
        `getConfiguracoesPublicas com campos novos falhou (migração pendente?), caindo pros campos estáveis: ${err}`,
      );
      config = await this.prismaService.cONFIGURACOES_LOJA.findUnique({
        where: { CD_CONFIGURACAO: 1 },
        select: {
          NM_LOJA: true,
          DS_URL_LOGO: true,
          DS_URL_FAVICON: true,
          NR_TELEFONE: true,
          DS_EMAIL_SUPORTE: true,
        },
      });
    }

    return (
      config ?? {
        NM_LOJA: null,
        DS_URL_LOGO: null,
        DS_URL_FAVICON: null,
        NR_TELEFONE: null,
        DS_EMAIL_SUPORTE: null,
        VL_FRETE_GRATIS_MINIMO: null,
        NR_PARCELAS_SEM_JUROS: null,
        NM_RAZAO_SOCIAL: null,
        NR_CNPJ: null,
        DS_ENDERECO_LOJA: null,
        DS_INSTAGRAM: null,
        DS_URL_BANNER_HOME: null,
        DS_URL_FOTO_COMBINACAO_1: null,
        DS_URL_FOTO_COMBINACAO_2: null,
        DS_TEXTO_RODAPE: null,
      }
    );
  }
}
