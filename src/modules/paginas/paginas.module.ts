import { Module } from '@nestjs/common';
import { PaginasAdminController } from './paginas-admin.controller';
import { PaginasPublicoController } from './paginas-publico.controller';
import { PaginasService } from './paginas.service';

@Module({
  controllers: [PaginasPublicoController, PaginasAdminController],
  providers: [PaginasService],
})
export class PaginasModule {}
