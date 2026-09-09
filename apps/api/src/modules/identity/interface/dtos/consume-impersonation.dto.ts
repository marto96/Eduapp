import { IsString } from 'class-validator';

export class ConsumeImpersonationDto {
  @IsString()
  code: string;
}
