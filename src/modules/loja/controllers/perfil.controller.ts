import { Body, Controller, Get, Put, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserJwtGuard } from 'src/modules/auth/guards/user-jwt.guard';
import { ChangePasswordDto, UpdatePerfilDto } from '../dto/update-perfil.dto';
import { PerfilService } from '../services/perfil.service';

@Controller('loja/perfil')
@UseGuards(UserJwtGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  async getPerfil(@Req() req: any, @Res() res: Response): Promise<any> {
    try {
      const result = await this.perfilService.getPerfil(req.user.userId);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put()
  async updatePerfil(
    @Req() req: any,
    @Res() res: Response,
    @Body() dto: UpdatePerfilDto,
  ): Promise<any> {
    try {
      const result = await this.perfilService.updatePerfil(
        req.user.userId,
        dto,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('senha')
  async changePassword(
    @Req() req: any,
    @Res() res: Response,
    @Body() dto: ChangePasswordDto,
  ): Promise<any> {
    try {
      const result = await this.perfilService.changePassword(
        req.user.userId,
        dto,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
