import { Body, Controller, Get, Param, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { UpdatePaginaInstitucionalDto } from '../admin/dto/pagina-institucional.dto';
import { PaginasService } from './paginas.service';

@Controller('admin/paginas-institucionais')
@UseGuards(AdminJwtGuard)
export class PaginasAdminController {
  constructor(private readonly paginasService: PaginasService) {}

  @Get()
  async listaTodas(@Res() res: Response) {
    try {
      const result = await this.paginasService.listaTodas();
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Put(':slug')
  async atualiza(
    @Res() res: Response,
    @Param('slug') slug: string,
    @Body() dto: UpdatePaginaInstitucionalDto,
  ) {
    try {
      const result = await this.paginasService.atualiza(slug, dto);
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }
}
