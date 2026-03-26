import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CreateProdutoDto, CreateVariacaoDto } from '../dto/create-produto.dto';
import { UpdateVariacaoDto } from '../dto/update-produto.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { ProdutosService } from '../services/produtos.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  // =========================================================
  // 1️⃣ ROTAS ESPECÍFICAS / ESTÁTICAS
  // (Precisam ser lidas antes para não caírem nos curingas)
  // =========================================================

  @Get('produtos')
  async listaProdutos(@Res() res: Response): Promise<any> {
    try {
      const result = await this.produtosService.listaProdutos();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Post('produtos')
  @UseInterceptors(FileInterceptor('file'))
  async createProduto(
    @Res() res: Response,
    @Body() dto: CreateProdutoDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      console.log(dto);
      const result = await this.produtosService.createProduto(dto, file);
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  // 👇 Movido para cima: Escapa do @Put('produtos/:cd_produto')
  @Put('produtos/variacao')
  async updateVariacao(
    @Res() res: Response,
    @Body() dto: UpdateVariacaoDto,
  ): Promise<any> {
    try {
      const result = await this.produtosService.editaVariacao(dto);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  // 👇 Movido para cima: Escapa do @Delete('produtos/:cd_produto')
  @Delete('produtos/variacao/:cd_variacao')
  async deleteVariacao(
    @Res() res: Response,
    @Param('cd_variacao') cd_variacao: number,
  ): Promise<any> {
    try {
      const result = await this.produtosService.deletaVariacao(cd_variacao);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  // 👇 Movido para cima: Escapa do @Delete('produtos/:cd_produto')
  @Delete('produtos/imagens/:cd_imagem')
  async deleteImagem(
    @Res() res: Response,
    @Param('cd_imagem') cd_imagem: number,
  ): Promise<any> {
    try {
      const result = await this.produtosService.deleteImagemProduto(cd_imagem);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  // Obs: O prefixo aqui é 'produto' (singular), então não dava conflito,
  // mas agrupar aqui mantém a organização limpa.
  @Post('produto/:produtoId/variacao')
  async createVariacao(
    @Res() res: Response,
    @Body() dto: CreateVariacaoDto,
    @Param('produtoId') produtoId: number,
  ): Promise<any> {
    try {
      const response = await this.produtosService.createVariacao(
        dto,
        produtoId,
      );
      return res.status(201).send(response);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  // =========================================================
  // 2️⃣ ROTAS DINÂMICAS / CURINGAS
  // (Ficam no final para capturar apenas o que sobrar)
  // =========================================================

  @Put('produtos/:cd_produto')
  async updateProduto(
    @Res() res: Response,
    @Param('cd_produto') cd_produto: number,
    @Body() dto: any,
  ): Promise<any> {
    try {
      const result = await this.produtosService.updateProduto(cd_produto, dto);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Delete('produtos/:cd_produto')
  async deleteProduto(
    @Res() res: Response,
    @Param('cd_produto') cd_produto: number,
  ): Promise<any> {
    try {
      const result = await this.produtosService.deletaProduto(cd_produto);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Post('produtos/:cd_produto/imagens')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadImagens(
    @Res() res: Response,
    @Param('cd_produto') cd_produto: number,
    @Body('ds_slug') ds_slug: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<any> {
    try {
      const result = await this.produtosService.uploadImagensProduto(
        cd_produto,
        files,
        ds_slug,
      );
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('produtos/:cd_produto/imagens/:cd_imagem/principal')
  async setImagemPrincipal(
    @Res() res: Response,
    @Param('cd_produto') cd_produto: number,
    @Param('cd_imagem') cd_imagem: number,
  ): Promise<any> {
    try {
      const result = await this.produtosService.setImagemPrincipal(
        cd_imagem,
        cd_produto,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
