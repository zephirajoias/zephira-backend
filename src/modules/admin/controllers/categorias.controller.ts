import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CategoriaCreateDto } from '../dto/create-categoria.dto';
import { UpdateCategoriaDto } from '../dto/update-categoria.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { CategoriasService } from '../services/categorias.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get('buscaTodasCategorias')
  async buscaTodasCategorias(@Res() res: Response): Promise<any> {
    try {
      const result = await this.categoriasService.buscaTodasCategorias();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('categorias-painel')
  async categoriasPainel(@Res() res: Response): Promise<any> {
    try {
      const result = await this.categoriasService.categoriasPainel();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Get('categoria-detalhes')
  async categoriaDetalhes(@Res() res: Response): Promise<any> {
    try {
      const result = await this.categoriasService.categoriaDetalhes();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Post('create-categoria')
  @UseInterceptors(FileInterceptor('file'))
  async createCategoria(
    @Res() res: Response,
    @Body() dto: CategoriaCreateDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      console.log(file);
      const result = await this.categoriasService.createCategoria(dto, file);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('update-categoria/:id')
  async updateCategoria(
    @Res() res: Response,
    @Body() dto: UpdateCategoriaDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const result = await this.categoriasService.updateCategoria(dto, id);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Delete('delete-categoria/:id')
  async deleteCategoria(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const result = await this.categoriasService.deleteCategoria(id);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
