import { IsOptional, IsString } from 'class-validator';

export class SearchGuardianLinkCandidatesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
