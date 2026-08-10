import { IsDateString, IsIn, IsString, IsUUID, MinLength } from 'class-validator';
import { ContractType } from '../../domain/entities/employee.entity';

const KNOWN_CONTRACT_TYPES: ContractType[] = ['planta', 'contrato', 'suplente'];

export class CreateEmployeeDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(1)
  position: string;

  @IsIn(KNOWN_CONTRACT_TYPES)
  contractType: ContractType;

  @IsDateString()
  hireDate: string;
}
