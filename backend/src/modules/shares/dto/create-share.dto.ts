import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateShareDto {
  /** Exactly one of fileId / noteId must be provided. */
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsUUID()
  noteId?: string;

  @IsOptional()
  @IsInt()
  @Min(60, { message: 'Expiration must be at least 60 seconds.' })
  @Max(31_536_000, { message: 'Expiration cannot exceed one year.' })
  expiresInSeconds?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Maximum accesses must be at least 1.' })
  @Max(100_000, { message: 'Maximum accesses is too large.' })
  maxAccesses?: number | null;

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @IsOptional()
  @IsString()
  @Length(8, 200, { message: 'Share password must be between 8 and 200 characters.' })
  password?: string | null;

  @IsOptional()
  @IsBoolean()
  strict?: boolean;

  @IsOptional()
  @IsBoolean()
  oneTime?: boolean;
}
