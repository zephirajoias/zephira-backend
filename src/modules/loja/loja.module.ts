import { EmailService } from 'src/common/email/email.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EnderecosController } from './controllers/enderecos.controller';
import { FreteController } from './controllers/frete.controller';
import { PagamentoController } from './controllers/pagamento.controller';
import { PedidosController } from './controllers/pedidos.controller';
import { PerfilController } from './controllers/perfil.controller';
import { EnderecosService } from './services/enderecos.service';
import { PagamentoService } from './services/pagamento.service';
import { PedidosExpiradosService } from './services/pedidos-expirados.service';
import { PedidosService } from './services/pedidos.service';
import { PerfilService } from './services/perfil.service';
import { SuperFreteService } from './services/superfrete.service';

@Module({
  imports: [AuthModule],
  controllers: [
    EnderecosController,
    PedidosController,
    PerfilController,
    PagamentoController,
    FreteController,
  ],
  providers: [
    EmailService,
    EnderecosService,
    PedidosService,
    PerfilService,
    PagamentoService,
    PedidosExpiradosService,
    SuperFreteService,
  ],
  exports: [SuperFreteService],
})
export class LojaModule {}
