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
import { UpdateConfiguracoesDto } from '../dto/update-configuracoes.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { ConfiguracoesService } from '../services/configuracoes.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class ConfiguracoesController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}

  @Get('configuracoes/gerais')
  async getConfiguracoesGerais(@Res() res: Response): Promise<any> {
    try {
      const result = await this.configuracoesService.getConfiguracoesGerais();
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Put('configuracoes/gerais')
  async updateConfiguracoesGerais(
    @Res() res: Response,
    @Body() dto: UpdateConfiguracoesDto,
  ): Promise<any> {
    try {
      const result =
        await this.configuracoesService.updateConfiguracoesGerais(dto);
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Post('configuracoes/favicon')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFavicon(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.uploadImagemMarca(
        'favicon',
        file,
      );
      return res.status(201).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Post('configuracoes/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.uploadImagemMarca(
        'logo',
        file,
      );
      return res.status(201).send(result);
    } catch (err) {
      throw err;
    }
  }

  // Carrossel do banner do topo — cada foto com link próprio (opcional).
  @Get('configuracoes/banner-home')
  async listarBannerHome(@Res() res: Response): Promise<any> {
    try {
      const result = await this.configuracoesService.listarBannersHome();
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Post('configuracoes/banner-home')
  @UseInterceptors(FileInterceptor('file'))
  async adicionarBannerHome(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
    @Body('link') link?: string,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.adicionarBannerHome(
        file,
        link,
      );
      return res.status(201).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Delete('configuracoes/banner-home/:indice')
  async removerBannerHome(
    @Res() res: Response,
    @Param('indice', ParseIntPipe) indice: number,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.removerBannerHome(
        indice,
      );
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Put('configuracoes/banner-home/mover')
  async reordenarBannerHome(
    @Res() res: Response,
    @Body('de', ParseIntPipe) de: number,
    @Body('para', ParseIntPipe) para: number,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.reordenarBannerHome(
        de,
        para,
      );
      return res.status(200).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Post('configuracoes/combinacao-1')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCombinacao1(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.uploadImagemHome(
        'combinacao_1',
        file,
      );
      return res.status(201).send(result);
    } catch (err) {
      throw err;
    }
  }

  @Post('configuracoes/combinacao-2')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCombinacao2(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      const result = await this.configuracoesService.uploadImagemHome(
        'combinacao_2',
        file,
      );
      return res.status(201).send(result);
    } catch (err) {
      throw err;
    }
  }
}
