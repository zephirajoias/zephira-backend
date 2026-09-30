import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PromocaoEmMassaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  percentual: number;

  // Sem isso, aplica em todas as peças ativas.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  CD_CATEGORIA?: number;
}

export class RemoverPromocaoEmMassaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  CD_CATEGORIA?: number;
}
