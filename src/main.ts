import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     transform: true,
  //     forbidNonWhitelisted: true,
  //   }),
  // );

  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
