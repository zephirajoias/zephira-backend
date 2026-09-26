import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';

export type AvisoPedido = 'recebido' | 'pago' | 'enviado';

const real = (v: unknown) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const escapar = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * E-mails automáticos pro cliente, pelo Resend (https://resend.com).
 * Desligado enquanto RESEND_API_KEY não existir no ambiente: nada é
 * enviado e nada quebra. O domínio do remetente precisa estar verificado no
 * Resend (registros DNS no Cloudflare), senão o Resend recusa o envio.
 *
 * Nunca lança erro: e-mail que falha não pode derrubar checkout, webhook
 * nem compra de etiqueta. Só registra no log.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prismaService: PrismaService) {}

  get ligado() {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async avisarPedido(cdPedido: number, aviso: AvisoPedido, codigoRastreio?: string | null) {
    if (!this.ligado) return;
    try {
      const pedido = await this.prismaService.pEDIDOS.findUnique({
        where: { CD_PEDIDO: cdPedido },
        include: {
          USUARIO: { select: { NM_USUARIO: true, DS_EMAIL: true } },
          ITENS_PEDIDO: {
            select: { NM_PRODUTO_SNAPSHOT: true, QT_ITEM: true, VL_TOTAL_ITEM: true },
          },
        },
      });
      if (!pedido?.USUARIO?.DS_EMAIL) return;

      const { assunto, titulo, texto } = TEXTOS[aviso](cdPedido, codigoRastreio);
      await this.enviar(
        pedido.USUARIO.DS_EMAIL,
        assunto,
        montarHtml({
          nome: pedido.USUARIO.NM_USUARIO.split(' ')[0],
          titulo,
          texto,
          codigoRastreio: aviso === 'enviado' ? codigoRastreio : null,
          itens: pedido.ITENS_PEDIDO,
          frete: pedido.VL_FRETE,
          desconto: pedido.VL_DESCONTO,
          total: pedido.VL_TOTAL,
          linkPedido: `${lojaUrl()}/minha-conta?pedido=${cdPedido}`,
        }),
      );
    } catch (err) {
      this.logger.error(`E-mail "${aviso}" do pedido #${cdPedido} falhou: ${err}`);
    }
  }

  private async enviar(para: string, assunto: string, html: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE || 'Zephira Joias <pedidos@zephirajoias.com.br>',
        to: [para],
        subject: assunto,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Resend respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  }
}

const lojaUrl = () =>
  (process.env.USER_FRONTEND_URL || 'https://www.zephirajoias.com.br').replace(/\/+$/, '');

const TEXTOS: Record<
  AvisoPedido,
  (n: number, codigo?: string | null) => { assunto: string; titulo: string; texto: string }
> = {
  recebido: (n) => ({
    assunto: `Recebemos seu pedido #${n}`,
    titulo: 'Pedido recebido',
    texto:
      'Seu pedido foi registrado. Assim que o Mercado Pago confirmar o pagamento, avisamos por aqui. Pedidos não pagos em 24 horas são cancelados automaticamente.',
  }),
  pago: (n) => ({
    assunto: `Pagamento aprovado: pedido #${n}`,
    titulo: 'Pagamento aprovado',
    texto:
      'Seu pagamento foi confirmado e já estamos separando suas peças. Quando o pedido for enviado, você recebe o código de rastreio.',
  }),
  enviado: (n, codigo) => ({
    assunto: `Seu pedido #${n} foi enviado`,
    titulo: 'Pedido enviado',
    texto: codigo
      ? 'Suas peças estão a caminho. Use o código abaixo para acompanhar a entrega no site da transportadora.'
      : 'Suas peças estão a caminho. O código de rastreio aparece em Minha conta.',
  }),
};

function montarHtml(d: {
  nome: string;
  titulo: string;
  texto: string;
  codigoRastreio?: string | null;
  itens: { NM_PRODUTO_SNAPSHOT: string; QT_ITEM: number; VL_TOTAL_ITEM: unknown }[];
  frete: unknown;
  desconto: unknown;
  total: unknown;
  linkPedido: string;
}) {
  const linhas = d.itens
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eef2f2">${i.QT_ITEM}x ${escapar(i.NM_PRODUTO_SNAPSHOT)}</td><td style="padding:8px 0;border-bottom:1px solid #eef2f2;text-align:right;white-space:nowrap">${real(i.VL_TOTAL_ITEM)}</td></tr>`,
    )
    .join('');
  const resumo = (rotulo: string, valor: string, forte = false) =>
    `<tr><td style="padding:4px 0;${forte ? 'font-weight:700' : 'color:#64748b'}">${rotulo}</td><td style="padding:4px 0;text-align:right;${forte ? 'font-weight:700' : 'color:#64748b'}">${valor}</td></tr>`;

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:13px;font-weight:700;letter-spacing:3px;color:#0f172a">ZEPHIRA JOIAS</td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:700">${d.titulo}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#334155">Olá, ${escapar(d.nome)}. ${d.texto}</td></tr>
${d.codigoRastreio ? `<tr><td style="padding-top:16px"><div style="background:#e7fbf9;border-radius:12px;padding:14px 16px;font-size:13px;color:#334155">Código de rastreio<br><span style="font-size:18px;font-weight:700;letter-spacing:1px;color:#0f172a">${escapar(d.codigoRastreio)}</span></div></td></tr>` : ''}
<tr><td style="padding-top:24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${linhas}
${resumo('Frete', real(d.frete ?? 0))}${Number(d.desconto) > 0 ? resumo('Desconto', `- ${real(d.desconto)}`) : ''}${resumo('Total', real(d.total), true)}</table></td></tr>
<tr><td style="padding-top:28px"><a href="${d.linkPedido}" style="display:inline-block;background:#11d4c4;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px">Ver meu pedido</a></td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:#94a3b8">Você recebeu este e-mail porque fez um pedido em zephirajoias.com.br.</td></tr>
</table></td></tr></table></body></html>`;
}
