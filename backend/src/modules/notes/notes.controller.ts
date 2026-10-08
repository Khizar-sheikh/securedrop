import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { getRequestContext } from '../../common/request-context';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ListNotesQuery } from './dto/list-notes.query';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(AccessTokenGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@Req() req: Request, @Query() query: ListNotesQuery) {
    return this.notes.list(req.user!.id, query);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateNoteDto) {
    return this.notes.create(req.user!.id, dto, getRequestContext(req));
  }

  @Get(':id')
  getOne(@Req() req: Request, @Param('id') id: string) {
    return this.notes.getOne(req.user!.id, id);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.notes.update(req.user!.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.notes.remove(req.user!.id, id, getRequestContext(req));
  }
}
