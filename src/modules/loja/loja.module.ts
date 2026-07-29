import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EnderecosController } from './controllers/enderecos.controller';
import { PedidosController } from './controllers/pedidos.controller';
import { PerfilController } from './controllers/perfil.controller';
import { EnderecosService } from './services/enderecos.service';
import { PedidosService } from './services/pedidos.service';
import { PerfilService } from './services/perfil.service';

@Module({
  imports: [AuthModule],
  controllers: [EnderecosController, PedidosController, PerfilController],
  providers: [EnderecosService, PedidosService, PerfilService],
})
export class LojaModule {}
