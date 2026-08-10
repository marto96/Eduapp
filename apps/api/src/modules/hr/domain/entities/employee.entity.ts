export type ContractType = 'planta' | 'contrato' | 'suplente';
export type EmployeeStatus = 'activo' | 'inactivo';

export class Employee {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly position: string,
    public readonly contractType: ContractType,
    public readonly hireDate: string,
    public readonly status: EmployeeStatus = 'activo',
  ) {}
}
