import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CreateAdminDto } from '../dto/create-admin.dto';
import {
  UpdateAdminDto,
  UpdateMeuPerfilDto,
  UpdatePasswordDto,
} from '../dto/update-admin.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { GoogleAdminOAuthGuard } from '../guards/google-admin-oauth.guard';
import { AdminService } from '../services/admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(AdminJwtGuard)
  @Get('listaAdmin')
  async listaAdmin(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.listaAdmin();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Post()
  async create(
    @Body() createAdminDto: CreateAdminDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const response = await this.adminService.create(createAdminDto);
      console.log(response);
      return res.status(201).send('Sucesso');
    } catch (error) {
      console.log(error);
      return res.status(409).json(error);
    }
  }

  @Get('auth/google')
  @UseGuards(GoogleAdminOAuthGuard)
  async googleAuth() {
    // Passport redireciona automaticamente para o Google
  }

  @Get('auth/google/callback')
  @UseGuards(GoogleAdminOAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const tokenData = this.adminService.generateAdminToken(req.user);

    res.cookie('zephira-token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.redirect(
      `${process.env.FRONTEND_URL ?? 'https://admin.zephirajoias.com.br/'}dashboard`,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async loginAdmin(
    @Body() loginAdminDto: CreateAdminDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const response = await this.adminService.authAdmin(loginAdminDto);
      return res.status(200).json(response);
    } catch (err) {
      console.log(err);
      return res.status(409).json(err);
    }
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const response = await this.adminService.forgotPassword(email);
      return res.status(200).json(response);
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ message: 'Erro ao processar a solicitação.' });
    }
  }

  @UseGuards(AdminJwtGuard) // Protege a rota
  @Put('me/password')
  async changePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    console.log(updatePasswordDto);
    return this.adminService.updatePassword(updatePasswordDto);
  }

  @UseGuards(AdminJwtGuard)
  @Put('me/profile')
  async updateMeuPerfil(
    @Req() req: any,
    @Body() dto: UpdateMeuPerfilDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const result = await this.adminService.updateMeuPerfil(
        req.user.userId,
        dto,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('painel')
  async totalPedidos(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.painelAdmin();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('painel-pedidos')
  async painelPedidos(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.painelPedidos();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('pedidos-recentes')
  async pedidosRecentes(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.pedidosRecentes();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('estoque-baixo')
  async estoqueBaixo(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.estoqueBaixo();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('produto-mais-vendido')
  async produtoMaisVendido(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.produtoMaisVendido();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('pedidos-detalhes')
  async pedidosDetalhes(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.pedidosDetalhes();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Get('estoque-detalhes')
  async estoqueDetalhes(@Res() res: Response): Promise<any> {
    try {
      const result = await this.adminService.estoqueDetalhes();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Delete(':id')
  async deleteAdmin(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      await this.adminService.deleteAdmin(Number(id));
      return res.status(200).send('sucesso');
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @UseGuards(AdminJwtGuard)
  @Put(':id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const result = await this.adminService.updateAdmin(
        Number(id),
        updateAdminDto,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
