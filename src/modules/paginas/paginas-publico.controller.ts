import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaginasService } from './paginas.service';

// Catálogo das páginas institucionais é público (sem login) — é o que a
// loja (apps/e-commerce) busca pra montar Sobre, Garantia, Trocas, FAQ,
// Como Comprar e Fale Conosco.
@Controller('paginas-institucionais')
export class PaginasPublicoController {
  constructor(private readonly paginasService: PaginasService) {}

  @Get(':slug')
  async buscaPorSlug(@Res() res: Response, @Param('slug') slug: string) {
    try {
      const result = await this.paginasService.buscaPorSlug(slug);
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }
}
