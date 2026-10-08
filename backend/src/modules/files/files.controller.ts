import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { getRequestContext } from '../../common/request-context';
import { ListFilesQuery } from './dto/list-files.query';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(AccessTokenGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(@Req() req: Request, @Query() query: ListFilesQuery) {
    return this.files.list(req.user!.id, query);
  }

  @Get(':id')
  getOne(@Req() req: Request, @Param('id') id: string) {
    return this.files.getOwned(req.user!.id, id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@Req() req: Request, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.files.upload(req.user!.id, file, getRequestContext(req));
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.files.remove(req.user!.id, id, getRequestContext(req));
  }
}
