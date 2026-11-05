import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdatePaginaInstitucionalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  NM_TITULO: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  DS_CONTEUDO: string;
}
