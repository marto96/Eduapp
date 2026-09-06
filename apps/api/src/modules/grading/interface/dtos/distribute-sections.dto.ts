import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DistributeSectionsDto {
  @IsUUID()
  academicYearId: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsUUID(undefined, { each: true })
  sectionIds: string[];
}
