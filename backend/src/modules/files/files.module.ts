import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { UPLOAD_TMP_DIR } from './upload-tmp';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        // Temp file on disk, random server-side name: uploads are streamed to
        // storage instead of buffered in memory, and never keep client names.
        storage: multer.diskStorage({
          destination: UPLOAD_TMP_DIR,
          filename: (_req, _file, callback) => callback(null, randomUUID()),
        }),
        limits: {
          fileSize: config.upload.maxBytes,
          files: 1,
          fields: 10,
          fieldSize: 16 * 1024,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
