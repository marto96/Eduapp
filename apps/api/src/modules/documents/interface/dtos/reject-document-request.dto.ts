import { IsString, MinLength } from 'class-validator';

export class RejectDocumentRequestDto {
  @IsString()
  @MinLength(1)
  reason: string;
}
