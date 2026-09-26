import {
  Body,
  Controller,
  Get,
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
}
