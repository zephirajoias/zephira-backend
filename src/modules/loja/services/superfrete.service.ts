import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';

interface Pacote {
  height: number;
  width: number;
  length: number;
  weight: number;
}

export interface OpcaoFrete {
  idServico: number;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
}

// Retirada na loja (sem frete, sem SuperFrete envolvido) — pedido da
// Thaís em 2026-11-05. idServico 0 é reservado pra essa opção (nenhum
// serviço real da SuperFrete usa 0); PedidosService.checkout trata esse
// valor como pickup e pula a reserva de envio.
export const ID_SERVICO_RETIRADA = 0;
const OPCAO_RETIRADA: OpcaoFrete = {
  idServico: ID_SERVICO_RETIRADA,
  transportadora: 'Retirada',
  servico: 'Retirada (apenas Salvador) — a combinar com o vendedor',
  preco: 0,
  prazoDias: 0,
};

interface DestinatarioEnvio {
  nome: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  documento?: string | null;
}

interface ItemEnvio {
  nome: string;
  quantidade: number;
  valorUnitario: number;
}

@Injectable()
export class SuperFreteService {
  private readonly logger = new Logger(SuperFreteService.name);
  private readonly baseUrl = 'https://api.superfrete.com';
  private readonly isConfigured: boolean;
  private readonly token?: string;
  private readonly userAgent: string;

  constructor(private readonly prismaService: PrismaService) {
    this.token = process.env.SUPERFRETE_TOKEN;
    this.isConfigured = Boolean(this.token);
    this.userAgent =
      process.env.SUPERFRETE_USER_AGENT ||
      'Zephira Joias (contato@zephirajoias.com.br)';

    if (!this.isConfigured) {
      this.logger.warn(
        'Cálculo de frete desabilitado: SUPERFRETE_TOKEN não configurado.',
      );
    }
  }

  /**
   * Endereço remetente e dimensões do pacote padrão. Prioridade: valor
   * cadastrado em Configurações > Configuração Geral no admin; se não
   * houver, cai para as variáveis de ambiente SUPERFRETE_*.
   */
  private async configuracaoEnvio(): Promise<{
    cepOrigem: string;
    remetente: {
      postal_code: string;
      name?: string;
      address?: string;
      number?: string;
      district?: string;
      city?: string;
      state_abbr?: string;
    };
    pacote: Pacote;
  }> {
    const config = await this.prismaService.cONFIGURACOES_LOJA.findUnique({
      where: { CD_CONFIGURACAO: 1 },
    });

    const cepOrigem = (
      config?.NR_CEP_REMETENTE || process.env.SUPERFRETE_REMETENTE_CEP || ''
    ).replace(/\D/g, '');

    return {
      cepOrigem,
      remetente: {
        postal_code: cepOrigem,
        name: config?.NM_REMETENTE || process.env.SUPERFRETE_REMETENTE_NOME,
        address:
          config?.DS_ENDERECO_REMETENTE ||
          process.env.SUPERFRETE_REMETENTE_ENDERECO,
        number:
          config?.NR_NUMERO_REMETENTE ||
          process.env.SUPERFRETE_REMETENTE_NUMERO,
        district:
          config?.NM_BAIRRO_REMETENTE ||
          process.env.SUPERFRETE_REMETENTE_BAIRRO,
        city:
          config?.NM_CIDADE_REMETENTE ||
          process.env.SUPERFRETE_REMETENTE_CIDADE,
        state_abbr:
          config?.DS_UF_REMETENTE || process.env.SUPERFRETE_REMETENTE_UF,
      },
      pacote: {
        height:
          Number(config?.NR_PACOTE_ALTURA) ||
          Number(process.env.SUPERFRETE_PACOTE_ALTURA) ||
          4,
        width:
          Number(config?.NR_PACOTE_LARGURA) ||
          Number(process.env.SUPERFRETE_PACOTE_LARGURA) ||
          12,
        length:
          Number(config?.NR_PACOTE_COMPRIMENTO) ||
          Number(process.env.SUPERFRETE_PACOTE_COMPRIMENTO) ||
          17,
        weight:
          Number(config?.NR_PACOTE_PESO) ||
          Number(process.env.SUPERFRETE_PACOTE_PESO) ||
          0.3,
      },
    };
  }

  private async requestUmaVez<T = any>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(
        `SuperFrete ${path} falhou (${res.status}): ${JSON.stringify(data)}`,
      );
    }

    return data as T;
  }

  // A API da SuperFrete falha de vez em quando com 502 (erro deles, não
  // nosso — confirmado 2026-11-05: 2 em 3 chamadas seguidas falharam, a do
  // meio funcionou normal). Sem isso, o cliente via "não encontramos
  // opções de frete" no carrinho por uma falha passageira. Uma tentativa
  // extra com um pequeno atraso resolve a maioria dos casos.
  private async request<T = any>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    try {
      return await this.requestUmaVez<T>(path, body);
    } catch (err) {
      this.logger.warn(`SuperFrete ${path} falhou, tentando de novo: ${err}`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      return this.requestUmaVez<T>(path, body);
    }
  }

  // Retirada aparece sempre, mesmo sem SuperFrete configurado ou se a API
  // deles falhar de novo depois do retry — nunca pode deixar o cliente
  // sem nenhuma opção no carrinho.
  async calcularFrete(cepDestino: string): Promise<OpcaoFrete[]> {
    if (!this.isConfigured) return [OPCAO_RETIRADA];

    try {
      const { cepOrigem, pacote } = await this.configuracaoEnvio();
      const cepLimpo = cepDestino.replace(/\D/g, '');

      const opcoes = await this.request<any[]>('/api/v0/calculator', {
        from: { postal_code: cepOrigem },
        to: { postal_code: cepLimpo },
        // Sem a lista de serviços a SuperFrete passou a responder "nenhum
        // frete válido" (set/2026). 1 PAC, 2 SEDEX, 3 Jadlog, 17 Mini
        // Envios, 31 Loggi.
        services: '1,2,3,17,31',
        package: pacote,
      });

      const opcoesValidas = opcoes
        .filter((opcao) => !opcao.has_error)
        .map((opcao) => ({
          idServico: opcao.id,
          transportadora: opcao.company?.name ?? opcao.name,
          servico: opcao.name,
          preco: Number(opcao.price),
          prazoDias: opcao.delivery_time,
        }));

      return [...opcoesValidas, OPCAO_RETIRADA];
    } catch (err) {
      this.logger.error(
        `calcularFrete falhou mesmo com retry, devolvendo só a retirada: ${err}`,
      );
      return [OPCAO_RETIRADA];
    }
  }

  /**
   * Reserva o envio no SuperFrete (equivalente a "adicionar ao carrinho").
   * Não cobra nada ainda — só a compra da etiqueta (comprarEtiqueta) cobra.
   */
  async reservarEnvio(
    idServico: number,
    destinatario: DestinatarioEnvio,
    itens: ItemEnvio[],
    valorSegurado: number,
  ): Promise<{ cartId: string; preco: number } | null> {
    if (!this.isConfigured) return null;

    const { remetente, pacote } = await this.configuracaoEnvio();

    const data = await this.request<{ id: string; price: number }>(
      '/api/v0/cart',
      {
        service: idServico,
        from: remetente,
        to: {
          postal_code: destinatario.cep.replace(/\D/g, ''),
          name: destinatario.nome,
          address: destinatario.endereco,
          number: destinatario.numero,
          district: destinatario.bairro,
          city: destinatario.cidade,
          state_abbr: destinatario.uf,
          document: destinatario.documento?.replace(/\D/g, ''),
        },
        products: itens.map((item) => ({
          name: item.nome,
          quantity: item.quantidade,
          unitary_value: item.valorUnitario,
        })),
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: valorSegurado,
        },
        volumes: [pacote],
      },
    );

    return { cartId: data.id, preco: Number(data.price) };
  }

  /**
   * Paga o envio reservado e gera a etiqueta de verdade.
   *
   * ATENÇÃO: isso cobra do saldo real da conta SuperFrete. O schema exato
   * dessa etapa (checkout -> generate -> print) não foi validado ao vivo
   * (só o /cart foi testado, que não cobra nada) — antes de confiar cegamente
   * nisso em produção, faça uma compra de teste manual pelo admin e confira
   * o resultado.
   */
  async comprarEtiqueta(
    cartId: string,
  ): Promise<{ trackingCode: string | null; labelUrl: string | null }> {
    if (!this.isConfigured) {
      throw new Error('SuperFrete não configurado.');
    }

    await this.request('/api/v0/checkout', { orders: [cartId] });

    const geracao = await this.request<any[]>('/api/v0/generate', {
      orders: [cartId],
    }).catch((err) => {
      this.logger.error('Falha ao gerar etiqueta após checkout', err);
      return null;
    });

    const impressao = await this.request<{ url: string }>('/api/v0/print', {
      orders: [cartId],
      mode: 'private',
    }).catch((err) => {
      this.logger.error('Falha ao obter link de impressão', err);
      return null;
    });

    return {
      trackingCode: geracao?.[0]?.tracking ?? null,
      labelUrl: impressao?.url ?? null,
    };
  }
}
