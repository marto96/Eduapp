import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { LeaveRepositoryPort } from '../ports/leave.repository.port';
import { Leave, LeaveType } from '../../domain/entities/leave.entity';
import { isExclusionViolation } from '../../../../core/database/postgres-error.util';

export interface CreateLeaveInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

@Injectable()
export class CreateLeaveUseCase {
  constructor(
    @Inject(EmployeeRepositoryPort) private readonly employees: EmployeeRepositoryPort,
    @Inject(LeaveRepositoryPort) private readonly leaves: LeaveRepositoryPort,
  ) {}

  async execute(input: CreateLeaveInput): Promise<Leave> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundException(`No existe el legajo "${input.employeeId}"`);
    }

    let leave: Leave;
    try {
      leave = new Leave(
        randomUUID(),
        input.employeeId,
        input.type,
        input.startDate,
        input.endDate,
        input.reason,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const existing = await this.leaves.findAll({ employeeId: input.employeeId });
    if (existing.some((other) => other.overlaps(leave))) {
      throw new ConflictException('El empleado ya tiene otra licencia cargada en ese rango de fechas');
    }

    try {
      await this.leaves.save(leave);
    } catch (err) {
      // Defensa en profundidad, mismo motivo que en CreateScheduleUseCase:
      // cierra la ventana de carrera entre el `findAll` y el `save` que el
      // chequeo de arriba no cubre por sí solo.
      if (isExclusionViolation(err)) {
        throw new ConflictException('La licencia se superpone con otra ya cargada para este empleado');
      }
      throw err;
    }
    return leave;
  }
}
