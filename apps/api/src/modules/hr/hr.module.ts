import { Module } from '@nestjs/common';
import { EmployeesController } from './interface/controllers/employees.controller';
import { LeavesController } from './interface/controllers/leaves.controller';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case';
import { TerminateEmployeeUseCase } from './application/use-cases/terminate-employee.use-case';
import { CreateLeaveUseCase } from './application/use-cases/create-leave.use-case';
import { ListLeavesUseCase } from './application/use-cases/list-leaves.use-case';
import { CancelLeaveUseCase } from './application/use-cases/cancel-leave.use-case';
import { EmployeeRepositoryPort } from './application/ports/employee.repository.port';
import { LeaveRepositoryPort } from './application/ports/leave.repository.port';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';
import { TypeOrmLeaveRepository } from './infrastructure/repositories/typeorm-leave.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [EmployeesController, LeavesController],
  providers: [
    CreateEmployeeUseCase,
    ListEmployeesUseCase,
    TerminateEmployeeUseCase,
    CreateLeaveUseCase,
    ListLeavesUseCase,
    CancelLeaveUseCase,
    { provide: EmployeeRepositoryPort, useClass: TypeOrmEmployeeRepository },
    { provide: LeaveRepositoryPort, useClass: TypeOrmLeaveRepository },
  ],
})
export class HrModule {}
