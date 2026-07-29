import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  NM_TAG: string;

  @IsString()
  @IsNotEmpty()
  DS_SLUG: string;
}
