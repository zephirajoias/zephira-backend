import { EmailService } from 'src/common/email/email.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { lerChavePrivada, lerChavePublica } from 'src/common/chaves-jwt';
import { LojaModule } from '../loja/loja.module';
import { AdminController } from './controllers/admin.controller';
import { CategoriasController } from './controllers/categorias.controller';
import { ConfiguracoesPublicasController } from './controllers/configuracoes-publicas.controller';
import { ConfiguracoesController } from './controllers/configuracoes.controller';
import { PedidosController } from './controllers/pedidos.controller';
import { ProdutosController } from './controllers/produtos.controller';
import { PromocoesController } from './controllers/promocoes.controller';
import { TagsController } from './controllers/tags.controller';
import { AdminService } from './services/admin.service';
import { CategoriasService } from './services/categorias.service';
import { ConfiguracoesService } from './services/configuracoes.service';
import { PedidosService } from './services/pedidos.service';
import { ProdutosService } from './services/produtos.service';
import { PromocoesService } from './services/promocoes.service';
import { TagsService } from './services/tags.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { GoogleAdminStrategy } from './strategies/google-admin.strategy';

@Module({
  imports: [
    LojaModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: async () => ({
        privateKey: lerChavePrivada(),
        publicKey: lerChavePublica(),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '8h',
        },
      }),
    }),
  ],
  controllers: [
    AdminController,
    CategoriasController,
    ProdutosController,
    PromocoesController,
    ConfiguracoesController,
    ConfiguracoesPublicasController,
    PedidosController,
    TagsController,
  ],
  providers: [
    EmailService,
    AdminService,
    AdminJwtStrategy,
    GoogleAdminStrategy,
    CategoriasService,
    ProdutosService,
    PromocoesService,
    ConfiguracoesService,
    PedidosService,
    TagsService,
  ],
})
export class AdminModule {}
