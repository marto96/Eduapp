import { IsString, MinLength } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  pendingToken: string;

  /** Un código TOTP de 6 dígitos, o un código de recuperación (formato "XXXX-XXXX-XXXX"). */
  @IsString()
  @MinLength(6)
  code: string;
}
