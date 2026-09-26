import { FiltroErros } from './common/filtro-erros';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Quantos proxies ficam na frente da API. Na VPS são 2 (Cloudflare e
  // nginx). Sem isso, todo visitante aparece como 127.0.0.1 e o limite de
  // requisições (60/min) vira um contador único pra loja inteira.
  const saltosProxy = Number(process.env.TRUST_PROXY_HOPS);
  if (saltosProxy > 0) {
    app.set('trust proxy', saltosProxy);
  }

  app.useGlobalFilters(new FiltroErros());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://zephira-frontend.vercel.app',
      'https://admin.zephirajoias.com.br',
      'https://www.zephirajoias.com.br',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true, // Importante para cookies
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  await app.listen(process.env.PORT ?? 3001);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
