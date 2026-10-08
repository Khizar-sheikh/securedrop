import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  // Length policy is enforced at registration; here only an upper bound is
  // needed so oversized payloads cannot trigger expensive hashing.
  @IsString()
  @MaxLength(200, { message: 'Password is too long.' })
  password!: string;
}
