import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import * as path from 'path';
import configuration from './config/configuration';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { PrismaModule } from './prisma/prisma.module';

const privateKeyPath = path.join(process.cwd(), 'keys/private.pem');
const publicKeyPath = path.join(process.cwd(), 'keys/public.pem');

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    AdminModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
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
          privateKey: privateKeyPath,
          publicKey: publicKeyPath,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '2h',
          },
        };
      },
    }),
    AuthModule,
  ],
})
export class AppModule {}
