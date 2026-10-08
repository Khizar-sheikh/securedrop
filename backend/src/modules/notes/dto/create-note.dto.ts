import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateNoteDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Title is required.' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters.' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000, { message: 'Note content cannot exceed 200000 characters.' })
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'A note can have at most 20 tags.' })
  @ArrayUnique({ message: 'Tags must be unique.' })
  @IsString({ each: true })
  @MaxLength(30, { each: true, message: 'Tags cannot exceed 30 characters.' })
  tags?: string[];
}
