export type ContractType = 'planta' | 'contrato' | 'suplente';
export type EmployeeStatus = 'activo' | 'inactivo';

export class Employee {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly position: string,
    public readonly contractType: ContractType,
    public readonly hireDate: string,
    public status: EmployeeStatus = 'activo',
    public readonly salary: number | null = null,
  ) {
    if (salary !== null && salary < 0) {
      throw new Error('El salario no puede ser negativo');
    }
  }

  terminate(): void {
    this.status = 'inactivo';
  }
}
