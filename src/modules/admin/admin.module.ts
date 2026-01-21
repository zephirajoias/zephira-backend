import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';
import { AdminController } from './controllers/admin.controller';
import { CategoriasController } from './controllers/categorias.controller';
import { ConfiguracoesController } from './controllers/configuracoes.controller';
import { ProdutosController } from './controllers/produtos.controller';
import { PromocoesController } from './controllers/promocoes.controller';
import { AdminService } from './services/admin.service';
import { CategoriasService } from './services/categorias.service';
import { ConfiguracoesService } from './services/configuracoes.service';
import { ProdutosService } from './services/produtos.service';
import { PromocoesService } from './services/promocoes.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

const privateKeyPath = path.join(process.cwd(), 'keys/private.pem');
const publicKeyPath = path.join(process.cwd(), 'keys/public.pem');

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: async () => {
        if (!privateKeyPath || !publicKeyPath) {
          throw new Error(
            'CRITICAL: JWT keys are missing in environment configuration.',
          );
        }

        return {
          privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
          publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '8h',
          },
        };
      },
    }),
  ],
  controllers: [
    AdminController,
    CategoriasController,
    ProdutosController,
    PromocoesController,
    ConfiguracoesController,
  ],
  providers: [
    AdminService,
    AdminJwtStrategy,
    CategoriasService,
    ProdutosService,
    PromocoesService,
    ConfiguracoesService,
  ],
})
export class AdminModule {}
