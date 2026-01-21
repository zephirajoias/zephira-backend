import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
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

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.adminService.update(+id, updateAdminDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.adminService.remove(+id);
  // }
}
