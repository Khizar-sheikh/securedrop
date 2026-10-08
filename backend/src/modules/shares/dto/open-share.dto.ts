import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class OpenShareDto {
  @IsString()
  @MaxLength(500, { message: 'This secure link is not valid.' })
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sessionSecret?: string;

  /** Metadata-only read: never creates a session or consumes an access. */
  @IsOptional()
  @IsBoolean()
  inspect?: boolean;
}
