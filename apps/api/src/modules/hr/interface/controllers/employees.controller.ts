import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateEmployeeUseCase } from '../../application/use-cases/create-employee.use-case';
import { ListEmployeesUseCase } from '../../application/use-cases/list-employees.use-case';
import { CreateEmployeeDto } from '../dtos/create-employee.dto';
import { ListEmployeesQueryDto } from '../dtos/list-employees-query.dto';

@Controller('hr/employees')
export class EmployeesController {
  constructor(
    private readonly createEmployee: CreateEmployeeUseCase,
    private readonly listEmployees: ListEmployeesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Hr'))
  async create(@Body() dto: CreateEmployeeDto) {
    return this.createEmployee.execute(dto);
  }

  // A diferencia de schedule/finance/grading: acá el GET también va detrás
  // de la policy, no hay bloque de lectura compartido para Hr (ver
  // AbilityFactory) — legajos no son visibles para docente/estudiante/
  // padre_tutor.
  @Get()
  @CheckPolicies((ability) => ability.can('read', 'Hr'))
  async list(@Query() query: ListEmployeesQueryDto) {
    return this.listEmployees.execute(query);
  }
}
