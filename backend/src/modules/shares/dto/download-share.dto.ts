import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DownloadShareDto {
  @IsString()
  @MaxLength(500, { message: 'This secure link is not valid.' })
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sessionSecret?: string;
}
