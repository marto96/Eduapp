import { IsBoolean } from 'class-validator';

export class SetScheduleVirtualDto {
  @IsBoolean()
  isVirtual: boolean;
}
