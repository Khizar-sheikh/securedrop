import { Body, Controller, HttpCode, Logger, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { PublicSharesService, OpenedShare, ShareInspection } from './public-shares.service';
import { OpenShareDto } from './dto/open-share.dto';
import { DownloadShareDto } from './dto/download-share.dto';
import { getRequestContext } from '../../common/request-context';

const contentDisposition = (filename: string): string => {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

@Controller('public/shares')
export class PublicSharesController {
  private readonly logger = new Logger(PublicSharesController.name);

  constructor(private readonly publicShares: PublicSharesService) {}

  @Post('open')
  @HttpCode(200)
  open(@Body() dto: OpenShareDto, @Req() req: Request): Promise<OpenedShare | ShareInspection> {
    return this.publicShares.open(dto, getRequestContext(req));
  }

  @Post('download')
  @HttpCode(200)
  async download(
    @Body() dto: DownloadShareDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.publicShares.download(dto, getRequestContext(req));

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', String(file.sizeBytes));
    res.setHeader('Content-Disposition', contentDisposition(file.filename));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200);

    try {
      await pipeline(file.body, res);
    } catch (error) {
      this.logger.debug(`download stream ended early: ${(error as Error).message}`);
    }
  }
}
