import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProductsService } from './products.service';

// Catálogo público: o Cloudflare (São Paulo) guarda a resposta por 60s e
// serve velha por até 5min enquanto renova, então o cliente não paga a
// viagem até a VPS (EUA) a cada visita. Só respostas 200 passam por aqui;
// erro nunca é cacheado.
//
// O CORS vai fixo no endereço da loja porque o cache não separa por Origin:
// uma resposta guardada a partir de um pedido do servidor (sem Origin) ou de
// outro site ficaria sem o cabeçalho certo e o navegador da loja falharia.
function respondeComCache(res: Response, corpo: unknown): Response {
  const loja = (
    process.env.USER_FRONTEND_URL ?? 'https://www.zephirajoias.com.br'
  ).replace(/\/+$/, '');
  res.set({
    'Cache-Control':
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    'Access-Control-Allow-Origin': loja,
    'Access-Control-Allow-Credentials': 'true',
  });
  return res.status(200).send(corpo);
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // =========================================================
  // Rotas estáticas primeiro para não colidir com o curinga ':slug'
  // =========================================================

  @Get('categorias')
  async listaCategorias(@Res() res: Response): Promise<any> {
    try {
      const result = await this.productsService.listaCategorias();
      return respondeComCache(res, result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('categorias/:slug')
  async buscaCategoriaPorSlug(
    @Res() res: Response,
    @Param('slug') slug: string,
    @Query('subcategoria') subcategoria?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<any> {
    try {
      const result = await this.productsService.buscaCategoriaPorSlug(
        slug,
        subcategoria,
        Number(page) || 1,
        Number(limit) || 20,
      );
      return respondeComCache(res, result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get()
  async listaProdutos(
    @Res() res: Response,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('categoria') categoria?: string,
    @Query('busca') busca?: string,
  ): Promise<any> {
    try {
      const result = await this.productsService.listaProdutos(
        Number(page) || 1,
        Number(limit) || 20,
        categoria,
        busca,
      );
      return respondeComCache(res, result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get(':slug')
  async buscaProdutoPorSlug(
    @Res() res: Response,
    @Param('slug') slug: string,
  ): Promise<any> {
    try {
      const result = await this.productsService.buscaProdutoPorSlug(slug);
      return respondeComCache(res, result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
