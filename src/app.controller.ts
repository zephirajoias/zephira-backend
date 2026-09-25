import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('')
export class AppController {
  // Usado pelo healthcheck do Docker e pelo CI, que confere se o commit no
  // ar (sha) é o que acabou de ser publicado. Um 200 sozinho não basta: o
  // container antigo continua respondendo 200 se o novo não subir.
  @SkipThrottle()
  @Get('health')
  health() {
    return { status: 'ok', sha: process.env.GIT_SHA ?? 'dev' };
  }
}
