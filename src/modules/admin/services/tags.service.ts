import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listaTags(): Promise<any[]> {
    return this.prismaService.tAGS.findMany({
      orderBy: { NM_TAG: 'asc' },
    });
  }

  async createTag(dto: CreateTagDto): Promise<any> {
    return this.prismaService.tAGS.create({
      data: {
        NM_TAG: dto.NM_TAG,
        DS_SLUG: dto.DS_SLUG,
      },
    });
  }

  async updateTag(id: number, dto: UpdateTagDto): Promise<any> {
    await this.garanteQueExiste(id);

    return this.prismaService.tAGS.update({
      where: { CD_TAG: id },
      data: {
        NM_TAG: dto.NM_TAG,
        DS_SLUG: dto.DS_SLUG,
      },
    });
  }

  async deleteTag(id: number): Promise<any> {
    await this.garanteQueExiste(id);

    return this.prismaService.tAGS.delete({
      where: { CD_TAG: id },
    });
  }

  async vincularProduto(cd_produto: number, cd_tag: number): Promise<any> {
    await this.garanteQueExiste(cd_tag);

    const jaVinculado = await this.prismaService.pRODUTOS_TAGS.findUnique({
      where: {
        CD_PRODUTO_CD_TAG: { CD_PRODUTO: cd_produto, CD_TAG: cd_tag },
      },
    });

    if (jaVinculado) {
      throw new ConflictException('Produto já possui essa tag.');
    }

    return this.prismaService.pRODUTOS_TAGS.create({
      data: { CD_PRODUTO: cd_produto, CD_TAG: cd_tag },
    });
  }

  async desvincularProduto(cd_produto: number, cd_tag: number): Promise<any> {
    return this.prismaService.pRODUTOS_TAGS.delete({
      where: {
        CD_PRODUTO_CD_TAG: { CD_PRODUTO: cd_produto, CD_TAG: cd_tag },
      },
    });
  }

  private async garanteQueExiste(id: number): Promise<void> {
    const tag = await this.prismaService.tAGS.findUnique({
      where: { CD_TAG: id },
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada.');
    }
  }
}
