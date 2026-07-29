import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProductsService } from './products.service';

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
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('categorias/:slug')
  async buscaCategoriaPorSlug(
    @Res() res: Response,
    @Param('slug') slug: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<any> {
    try {
      const result = await this.productsService.buscaCategoriaPorSlug(
        slug,
        Number(page) || 1,
        Number(limit) || 20,
      );
      return res.status(200).send(result);
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
      return res.status(200).send(result);
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
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
