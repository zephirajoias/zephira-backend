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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CreateProdutoDto, CreateVariacaoDto } from '../dto/create-produto.dto';
import { UpdateVariacaoDto } from '../dto/update-produto.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { ProdutosService } from '../services/produtos.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

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
}
