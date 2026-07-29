import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { TagsService } from '../services/tags.service';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('tags')
  async listaTags(@Res() res: Response): Promise<any> {
    try {
      const result = await this.tagsService.listaTags();
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Post('tags')
  async createTag(
    @Res() res: Response,
    @Body() dto: CreateTagDto,
  ): Promise<any> {
    try {
      const result = await this.tagsService.createTag(dto);
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Put('tags/:id')
  async updateTag(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTagDto,
  ): Promise<any> {
    try {
      const result = await this.tagsService.updateTag(id, dto);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Delete('tags/:id')
  async deleteTag(
    @Res() res: Response,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    try {
      const result = await this.tagsService.deleteTag(id);
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Post('produtos/:cd_produto/tags/:cd_tag')
  async vincularTag(
    @Res() res: Response,
    @Param('cd_produto', ParseIntPipe) cd_produto: number,
    @Param('cd_tag', ParseIntPipe) cd_tag: number,
  ): Promise<any> {
    try {
      const result = await this.tagsService.vincularProduto(
        cd_produto,
        cd_tag,
      );
      return res.status(201).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }

  @Delete('produtos/:cd_produto/tags/:cd_tag')
  async desvincularTag(
    @Res() res: Response,
    @Param('cd_produto', ParseIntPipe) cd_produto: number,
    @Param('cd_tag', ParseIntPipe) cd_tag: number,
  ): Promise<any> {
    try {
      const result = await this.tagsService.desvincularProduto(
        cd_produto,
        cd_tag,
      );
      return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(409).send(err);
    }
  }
}
