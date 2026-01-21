import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USUARIO } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { CreateAdminDto } from '../dto/create-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<USUARIO> {
    const verificarAdmin = await this.prismaService.uSUARIO.findUnique({
      where: { DS_EMAIL: createAdminDto.DS_EMAIL },
    });

    if (verificarAdmin) {
      throw new ConflictException(
        'Já existe um administrador com este e-mail.',
      );
    }

    const ADMIN = 'ADMIN';

    const salt = 10;
    const hashSenha = await bcrypt.hash(createAdminDto.DS_SENHA, salt);

    return this.prismaService.uSUARIO.create({
      data: {
        NM_USUARIO: createAdminDto.NM_USUARIO,
        DS_EMAIL: createAdminDto.DS_EMAIL,
        DS_SENHA_HASH: hashSenha,
        TP_PERFIL: ADMIN,
        NR_TELEFONE: createAdminDto.NR_TELEFONE,
        TS_CRIACAO: createAdminDto.TS_CRIACAO,
        TS_ATUALIZACAO: createAdminDto.TS_ATUALIZACAO,
      },
    });
  }

  async deleteAdmin(id: number): Promise<void> {
    console.log(id);
    await this.prismaService.uSUARIO.delete({
      where: { CD_USUARIO: Number(id) },
    });
  }

  async authAdmin(loginAdminDto: CreateAdminDto) {
    const verificaAdmin = await this.prismaService.uSUARIO.findUnique({
      where: { DS_EMAIL: loginAdminDto.DS_EMAIL },
    });

    if (
      !verificaAdmin ||
      !(await bcrypt.compare(
        loginAdminDto.DS_SENHA,
        verificaAdmin.DS_SENHA_HASH,
      ))
    ) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload = {
      sub: verificaAdmin.CD_USUARIO,
      email: verificaAdmin.DS_EMAIL,
      roles: verificaAdmin.TP_PERFIL,
      name: verificaAdmin.NM_USUARIO,
    };

    const access_token = this.jwtService.sign(payload);

    // Decodificamos o token recém-criado para pegar o 'exp' gerado automaticamente
    const decoded = this.jwtService.decode(access_token);

    return {
      access_token,
      expires_at: decoded.exp, // Retorna o timestamp (ex: 1715832000)
      user: {
        name: verificaAdmin.NM_USUARIO,
        role: verificaAdmin.TP_PERFIL,
      },
    };
  }

  async listaAdmin(): Promise<any> {
    const admin = await this.prismaService.uSUARIO.findMany({
      where: { TP_PERFIL: 'ADMIN' },
    });
    return admin;
  }

  async painelAdmin(): Promise<{
    totalPedidos: number;
    novoPedidos: number;
    dashboard: any;
  }> {
    function toNumber(value: any): number {
      if (typeof value === 'bigint') return Number(value);
      return value ?? 0;
    }

    const resultadoRaw = await this.prismaService.$queryRaw<
      Array<{
        vl_vendas_atual: number;
        pc_crescimento_vendas: number;
        qt_pedidos_hoje: number;
        pc_crescimento_pedidos: number;
        qt_clientes_ativos: number;
        pc_crescimento_clientes: number;
        qt_alerta_estoque: number;
      }>
    >`WITH periodos AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE) AS inicio_mes_atual,
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS inicio_mes_anterior,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 second' AS fim_mes_anterior,
        CURRENT_DATE AS hoje,
        CURRENT_DATE - INTERVAL '1 day' AS ontem
),
metricas_vendas AS (
    SELECT
        COALESCE(
            SUM(
                CASE 
                    WHEN P."TS_CRIACAO" >= ps.inicio_mes_atual
                    THEN P."VL_TOTAL" 
                    ELSE 0 
                END
            ), 0
        ) AS VL_VENDAS_ATUAL,

        COALESCE(
            SUM(
                CASE 
                    WHEN P."TS_CRIACAO" >= ps.inicio_mes_anterior 
                     AND P."TS_CRIACAO" <= ps.fim_mes_anterior
                    THEN P."VL_TOTAL" 
                    ELSE 0 
                END
            ), 0
        ) AS VL_VENDAS_ANTERIOR
    FROM
        "Zephira"."PEDIDOS" P,
		periodos ps
    WHERE
        P."TP_STATUS" NOT IN ('CANCELADO', 'DEVOLVIDO')
),
metricas_pedidos AS(
	SELECT
		COUNT(CASE WHEN DATE("TS_CRIACAO") = ps.hoje THEN 1 END) as qt_pedidos_hoje,
		COUNT(CASE WHEN DATE("TS_CRIACAO") = ps.ontem THEN 1 END) as qt_pedidos_ontem
	FROM
		"Zephira"."PEDIDOS" P,
		periodos ps
),
metricas_clientes AS(
	SELECT
		COUNT(*) as qt_clientes_total,
		COUNT(CASE WHEN U."TS_CRIACAO" >= (NOW() - INTERVAL '30 days') THEN 1 END) as qt_clientes_novos
	FROM
		"Zephira"."USUARIO" U
	WHERE
		U."TP_PERFIL" = 'USUARIO'
),
metricas_estoque AS(
	SELECT
		COUNT(*) as qt_alerta_estoque
	FROM
		"Zephira"."VARIACOES_PRODUTO" VP
	WHERE
		VP."QT_ESTOQUE" <= 5
)
SELECT 
    -- 1. Vendas
    v.VL_VENDAS_ATUAL        AS vl_vendas_atual,
    CASE 
        WHEN v.VL_VENDAS_ANTERIOR = 0 THEN 100
        ELSE ROUND(
            ((v.VL_VENDAS_ATUAL - v.VL_VENDAS_ANTERIOR) / v.VL_VENDAS_ANTERIOR) * 100,
            1
        )
    END                     AS pc_crescimento_vendas,

    -- 2. Pedidos
    pe.qt_pedidos_hoje      AS qt_pedidos_hoje,
    CASE 
        WHEN pe.qt_pedidos_ontem = 0 THEN 100 
        ELSE ROUND(
            ((pe.qt_pedidos_hoje - pe.qt_pedidos_ontem)::DECIMAL / pe.qt_pedidos_ontem) * 100,
            1
        )
    END                     AS pc_crescimento_pedidos,

    -- 3. Clientes
    c.qt_clientes_total     AS qt_clientes_ativos,
    ROUND(
        (c.qt_clientes_novos::DECIMAL / NULLIF(c.qt_clientes_total, 0)) * 100,
        1
    )                       AS pc_crescimento_clientes,

    -- 4. Estoque
    e.qt_alerta_estoque     AS qt_alerta_estoque

FROM 
    metricas_vendas v, 
    metricas_pedidos pe, 
    metricas_clientes c, 
    metricas_estoque e`;

    // 2. Extrai o primeiro item do array (o objeto de métricas)
    const metricas = resultadoRaw[0] || {};

    // 3. Busca os outros dados que você já tinha (exemplos baseados no que conversamos antes)
    const totalPedidos = await this.prismaService.pEDIDOS.count();

    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const novoPedidos = await this.prismaService.pEDIDOS.count({
      where: { TS_CRIACAO: { gte: trintaDiasAtras } },
    });

    // 4. Retorna tudo estruturado
    return {
      totalPedidos: toNumber(totalPedidos),
      novoPedidos: toNumber(novoPedidos),
      dashboard: {
        vendas: {
          valorAtual: toNumber(metricas.vl_vendas_atual),
          porcentagemCrescimento: Number(metricas.pc_crescimento_vendas) || 0,
        },
        pedidos: {
          quantidadeHoje: toNumber(metricas.qt_pedidos_hoje),
          porcentagemCrescimento: Number(metricas.pc_crescimento_pedidos) || 0,
        },
        clientes: {
          totalAtivos: toNumber(metricas.qt_clientes_ativos),
          porcentagemNovos: Number(metricas.pc_crescimento_clientes) || 0,
        },
        estoque: {
          alertas: toNumber(metricas.qt_alerta_estoque),
        },
      },
    };
  }

  async painelPedidos(): Promise<{
    dashboard: {
      pendentes: {
        quantidade: number;
        tendencia: number;
      };
      receitaHoje: {
        valor: number;
        tendencia: number;
      };
      aEnviar: {
        quantidade: number;
        tendencia: number;
      };
      devolucoes: {
        quantidade: number;
        tendencia: number;
      };
    };
  }> {
    const resultadoRaw = await this.prismaService.$queryRaw<
      Array<{
        qt_pendentes_hoje: number;
        pc_tendencia_pendentes: number;
        vl_receita_hoje: number;
        pc_tendencia_receita: number;
        qt_a_enviar: number;
        pc_tendencia_envio: number;
        qt_devolucoes: number;
        pc_tendencia_devolucoes: number;
      }>
    >`WITH periodos AS (
    SELECT 
        CURRENT_DATE AS hoje,
        CURRENT_DATE - INTERVAL '1 day' AS ontem
),
metricas_pendentes AS (
    SELECT
        COUNT(CASE WHEN P."TP_STATUS" = 'PENDENTE' AND DATE(P."TS_CRIACAO") = ps.hoje THEN 1 END) as qt_pendentes_hoje,
        COUNT(CASE WHEN P."TP_STATUS" = 'PENDENTE' AND DATE(P."TS_CRIACAO") = ps.ontem THEN 1 END) as qt_pendentes_ontem
    FROM
        "Zephira"."PEDIDOS" P,
        periodos ps
),
metricas_receita AS (
    SELECT
        COALESCE(
            SUM(
                CASE 
                    WHEN DATE(P."TS_CRIACAO") = ps.hoje 
                     AND P."TP_STATUS" NOT IN ('CANCELADO', 'DEVOLVIDO')
                    THEN P."VL_TOTAL" 
                    ELSE 0 
                END
            ), 0
        ) AS vl_receita_hoje,

        COALESCE(
            SUM(
                CASE 
                    WHEN DATE(P."TS_CRIACAO") = ps.ontem 
                     AND P."TP_STATUS" NOT IN ('CANCELADO', 'DEVOLVIDO')
                    THEN P."VL_TOTAL" 
                    ELSE 0 
                END
            ), 0
        ) AS vl_receita_ontem
    FROM
        "Zephira"."PEDIDOS" P,
        periodos ps
),
metricas_envio AS (
    SELECT
        -- Total acumulado na fila (Backlog)
        COUNT(CASE WHEN P."TP_STATUS" IN ('PAGO', 'PROCESSANDO') THEN 1 END) as qt_enviar_total,
        -- Base comparativa (ex: quantos entraram nessa fila ontem)
        COUNT(CASE WHEN P."TP_STATUS" IN ('PAGO', 'PROCESSANDO') AND DATE(P."TS_CRIACAO") = ps.ontem THEN 1 END) as qt_enviar_base
    FROM
        "Zephira"."PEDIDOS" P,
        periodos ps
),
metricas_devolucoes AS (
    SELECT
        COUNT(CASE WHEN P."TP_STATUS" = 'DEVOLVIDO' AND DATE(P."TS_ATUALIZACAO") = ps.hoje THEN 1 END) as qt_devolucoes_hoje,
        COUNT(CASE WHEN P."TP_STATUS" = 'DEVOLVIDO' AND DATE(P."TS_ATUALIZACAO") = ps.ontem THEN 1 END) as qt_devolucoes_ontem
    FROM
        "Zephira"."PEDIDOS" P,
        periodos ps
)
SELECT 
    -- 1. Pedidos Pendentes
    mp.qt_pendentes_hoje        AS qt_pendentes_hoje,
    CASE 
        WHEN mp.qt_pendentes_ontem = 0 THEN 0 -- Se ontem foi 0, crescimento é relativo
        ELSE ROUND(
            ((mp.qt_pendentes_hoje - mp.qt_pendentes_ontem)::DECIMAL / mp.qt_pendentes_ontem) * 100,
            1
        )
    END                         AS pc_tendencia_pendentes,

    -- 2. Receita Hoje
    mr.vl_receita_hoje          AS vl_receita_hoje,
    CASE 
        WHEN mr.vl_receita_ontem = 0 THEN 100 
        ELSE ROUND(
            ((mr.vl_receita_hoje - mr.vl_receita_ontem) / mr.vl_receita_ontem) * 100,
            1
        )
    END                         AS pc_tendencia_receita,

    -- 3. A Enviar (Backlog)
    me.qt_enviar_total          AS qt_a_enviar,
    CASE 
        WHEN me.qt_enviar_base = 0 THEN 0
        ELSE ROUND(
            ((me.qt_enviar_total - me.qt_enviar_base)::DECIMAL / me.qt_enviar_base) * 100,
            1
        )
    END                         AS pc_tendencia_envio,

    -- 4. Devoluções
    md.qt_devolucoes_hoje       AS qt_devolucoes,
    CASE 
        WHEN md.qt_devolucoes_ontem = 0 THEN 0 
        ELSE ROUND(
            ((md.qt_devolucoes_hoje - md.qt_devolucoes_ontem)::DECIMAL / md.qt_devolucoes_ontem) * 100,
            1
        )
    END                         AS pc_tendencia_devolucoes

FROM 
    metricas_pendentes mp, 
    metricas_receita mr, 
    metricas_envio me, 
    metricas_devolucoes md`;

    const metricas = resultadoRaw[0];

    const dashboard = {
      pendentes: {
        quantidade: Number(metricas.qt_pendentes_hoje),
        tendencia: Number(metricas.pc_tendencia_pendentes),
      },
      receitaHoje: {
        valor: Number(metricas.vl_receita_hoje),
        tendencia: Number(metricas.pc_tendencia_receita),
      },
      aEnviar: {
        quantidade: Number(metricas.qt_a_enviar),
        tendencia: Number(metricas.pc_tendencia_envio),
      },
      devolucoes: {
        quantidade: Number(metricas.qt_devolucoes),
        tendencia: Number(metricas.pc_tendencia_devolucoes),
      },
    };

    // Segurança defensiva
    if (!metricas) {
      return {
        dashboard: {
          pendentes: { quantidade: 0, tendencia: 0 },
          receitaHoje: { valor: 0, tendencia: 0 },
          aEnviar: { quantidade: 0, tendencia: 0 },
          devolucoes: { quantidade: 0, tendencia: 0 },
        },
      };
    }

    return {
      dashboard,
    };
  }

  async pedidosRecentes(): Promise<any[]> {
    const pedidos = await this.prismaService.$queryRaw<
      Array<{
        ds_id_visual: string;
        nm_produto_exibicao: string;
        nm_usuario: string;
        ds_data_formatada: string;
        vl_total: number;
        tp_status: string;
        ds_cor_status_css: string;
      }>
    >`SELECT 
    '#ORD-' || p."CD_PEDIDO" AS ds_id_visual,
    COALESCE(
        (SELECT ip."NM_PRODUTO_SNAPSHOT"
         FROM "Zephira"."ITENS_PEDIDO" ip 
         WHERE ip."CD_PEDIDO" = p."CD_PEDIDO" 
         LIMIT 1), 
         'Mix de Produtos'
    ) AS nm_produto_exibicao,
    u."NM_USUARIO",
    TO_CHAR(p."TS_CRIACAO", 'DD Mon') AS ds_data_formatada,
    p."VL_TOTAL",
    p."TP_STATUS",
    CASE 
        WHEN p."TP_STATUS" = 'PENDENTE' THEN 'warning'
        WHEN p."TP_STATUS" = 'ENVIADO' THEN 'info'
        WHEN p."TP_STATUS" = 'ENTREGUE' THEN 'success'
        WHEN p."TP_STATUS" = 'CANCELADO' THEN 'danger'
        ELSE 'secondary'
    END as ds_cor_status_css
FROM 
    "Zephira"."PEDIDOS" p,
	"Zephira"."USUARIO" u
WHERE
	U."CD_USUARIO" = p."CD_USUARIO"
ORDER BY 
    p."TS_CRIACAO" DESC
LIMIT 5;`;

    return pedidos;
  }

  async produtoMaisVendido(): Promise<any[]> {
    const maisVendido = await this.prismaService.$queryRaw<
      Array<{
        nm_produto: string;
        qt_total_vendida: string;
        ds_imagem_thumb: string;
      }>
    >`SELECT
    P."NM_PRODUTO",
    SUM(IP."QT_ITEM") AS qt_total_vendida,
    IMG."DS_URL" AS "DS_IMAGEM_THUMB"
FROM
    "Zephira"."ITENS_PEDIDO" IP,
    "Zephira"."VARIACOES_PRODUTO" VP,
    "Zephira"."PRODUTOS" P,
    "Zephira"."PEDIDOS" PED,
    "Zephira"."IMAGENS_PRODUTO" IMG
WHERE
    IP."CD_VARIACAO" = VP."CD_VARIACAO"
    AND VP."CD_PRODUTO" = P."CD_PRODUTO"
    AND IP."CD_PEDIDO" = PED."CD_PEDIDO"
    AND IMG."CD_PRODUTO" = P."CD_PRODUTO"
    AND IMG."SN_PRINCIPAL" = '1'
    AND PED."TP_STATUS" NOT IN ('CANCELADO', 'DEVOLVIDO')
GROUP BY
    P."CD_PRODUTO",
    P."NM_PRODUTO",
    IMG."DS_URL"
ORDER BY
    qt_total_vendida DESC
LIMIT
    1;`;

    return maisVendido;
  }

  async estoqueBaixo(): Promise<any[]> {
    const estoque = await this.prismaService.$queryRaw<
      Array<{
        nm_produto: string;
        cd_sku: string;
        ds_tamanho: string;
        qt_estoque: number;
        ds_imagem_thumb: string;
      }>
    >`SELECT 
	P."NM_PRODUTO",
	VP."CD_SKU",
	VP."DS_TAMANHO",
	VP."QT_ESTOQUE",
	IMG."DS_URL" as "DS_IMAGEM_THUMB"
FROM
	"Zephira"."VARIACOES_PRODUTO" VP,
	"Zephira"."PRODUTOS" P,
	"Zephira"."IMAGENS_PRODUTO" IMG
WHERE
	1=1
	AND VP."CD_PRODUTO" = P."CD_PRODUTO"
	AND VP."QT_ESTOQUE" <= 15
	AND IMG."CD_PRODUTO" = P."CD_PRODUTO"
ORDER by
	IMG."SN_PRINCIPAL" DESC, 
	IMG."NR_ORDEM" ASC`;

    return estoque;
  }

  async pedidosDetalhes(): Promise<any[]> {
    const pedidos = await this.prismaService.$queryRaw<
      Array<{
        cd_pedido: number;
        ds_data_formatada: string;
        nm_usuario: string;
        ds_email: string;
        nm_produto_exibicao: string;
        vl_total: number;
        tp_metodo_pagamento: string;
        tp_status: string;
        ds_cor_status_css: string;
      }>
    >`SELECT
	P."CD_PEDIDO",
	TO_CHAR(p."TS_CRIACAO", 'DD Mon') AS ds_data_formatada,
	U."NM_USUARIO",
	U."DS_EMAIL",
	COALESCE(
        (SELECT ip."NM_PRODUTO_SNAPSHOT"
         FROM "Zephira"."ITENS_PEDIDO" ip 
         WHERE ip."CD_PEDIDO" = P."CD_PEDIDO" 
         LIMIT 1), 
         'Mix de Produtos'
    	) AS nm_produto_exibicao,
	P."VL_TOTAL",
	P."TP_METODO_PAGAMENTO",
    P."TP_STATUS",
	CASE 
        WHEN P."TP_STATUS" = 'PENDENTE' THEN 'warning'
        WHEN P."TP_STATUS" = 'ENVIADO' THEN 'info'
        WHEN P."TP_STATUS" = 'ENTREGUE' THEN 'success'
        WHEN P."TP_STATUS" = 'CANCELADO' THEN 'danger'
        ELSE 'secondary'
    END as ds_cor_status_css
FROM
	"Zephira"."PEDIDOS" P,
	"Zephira"."USUARIO" U
WHERE
	P."CD_USUARIO" = U."CD_USUARIO";`;

    return pedidos;
  }

  async estoqueDetalhes(): Promise<any[]> {
    const estoque = await this.prismaService.$queryRaw`
      SELECT
    vp."CD_VARIACAO",
    vp."DS_TAMANHO",
    p."CD_PRODUTO",
    p."NM_PRODUTO",
    vp."CD_SKU",
    COALESCE(img."DS_URL", '/assets/placeholder.png') AS ds_imagem_thumb,
    c."CD_CATEGORIA",
    c."NM_CATEGORIA",
    p."VL_PRECO",
    COALESCE(vp."QT_ESTOQUE", 0) AS "QT_ESTOQUE",
    CASE
        WHEN COALESCE(vp."QT_ESTOQUE", 0) <= 0 THEN 'Esgotado'
        WHEN COALESCE(vp."QT_ESTOQUE", 0) <= 5 THEN 'Estoque Baixo'
        ELSE 'Em Estoque'
    END AS ds_status_texto,
    CASE
        WHEN COALESCE(vp."QT_ESTOQUE", 0) <= 0 THEN 'esgotado'
        WHEN COALESCE(vp."QT_ESTOQUE", 0) <= 5 THEN 'baixo'
        ELSE 'ok'
    END AS ds_css_status
FROM
    "Zephira"."PRODUTOS" p
    LEFT JOIN "Zephira"."VARIACOES_PRODUTO" vp ON vp."CD_PRODUTO" = p."CD_PRODUTO"
    LEFT JOIN "Zephira"."PRODUTOS_CATEGORIA" pc ON pc."CD_PRODUTO" = p."CD_PRODUTO"
    LEFT JOIN "Zephira"."CATEGORIA" c ON c."CD_CATEGORIA" = pc."CD_CATEGORIA"
    LEFT JOIN "Zephira"."IMAGENS_PRODUTO" img ON img."CD_PRODUTO" = p."CD_PRODUTO"
ORDER BY
    p."NM_PRODUTO" ASC,
    vp."CD_VARIACAO" ASC;
    `;

    return estoque as any[];
  }

  async categoriasPainel(): Promise<any[]> {
    const categorias = await this.prismaService.$queryRaw<
      Array<{
        TOTAL_CATEGORIAS: number;
        TOTAL_PRODUTOS: number;
        TOTAL_ATIVOS: number;
      }>
    >`SELECT 
	COUNT(C.*) TOTAL_CATEGORIAS,
	COUNT(PC.*) TOTAL_PRODUTOS,
	COUNT(C."SN_ATIVO") TOTAL_ATIVOS
FROM
	"Zephira"."CATEGORIA" C,
	"Zephira"."PRODUTOS_CATEGORIA" PC
WHERE
	PC."CD_CATEGORIA" = C."CD_CATEGORIA"
	AND C."SN_ATIVO" = 1`;

    return categorias;
  }

  async categoriaDetalhes(): Promise<any[]> {
    const categoriaDetalhes = await this.prismaService.$queryRaw<
      Array<{
        CD_CATEGORIA: number;
        NM_CATEGORIA: string;
        DS_SLUG: string;
        DS_URL_IMAGEM: string;
        QUANT_PRODUTO_CATEGORIA: number;
        SN_ATIVO: number;
        ds_css_status: string;
      }>
    >`SELECT 
	C."CD_CATEGORIA",
	C."NM_CATEGORIA",
	C."DS_SLUG",
	C."DS_URL_IMAGEM",
	(
		SELECT COUNT(*)
		FROM "Zephira"."PRODUTOS_CATEGORIA" PC
		WHERE PC."CD_CATEGORIA"=C."CD_CATEGORIA"
	) QUANT_PRODUTO_CATEGORIA,
	C."SN_ATIVO",
    CASE 
        WHEN C."SN_ATIVO" = 1 THEN 'success' 
        ELSE 'secondary' 
    END AS ds_css_status
FROM
	"Zephira"."CATEGORIA" C`;

    return categoriaDetalhes;
  }
  // findAll() {
  //   return `This action returns all admin`;
  // }

  // update(id: number, updateAdminDto: UpdateAdminDto) {
  //   return `This action updates a #${id} admin`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} admin`;
  // }
}
