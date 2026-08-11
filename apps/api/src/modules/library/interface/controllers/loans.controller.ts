import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateLoanUseCase } from '../../application/use-cases/create-loan.use-case';
import { ListLoansUseCase } from '../../application/use-cases/list-loans.use-case';
import { ReturnLoanUseCase } from '../../application/use-cases/return-loan.use-case';
import { CreateLoanDto } from '../dtos/create-loan.dto';
import { ListLoansQueryDto } from '../dtos/list-loans-query.dto';

@Controller('library/loans')
export class LoansController {
  constructor(
    private readonly createLoan: CreateLoanUseCase,
    private readonly listLoans: ListLoansUseCase,
    private readonly returnLoan: ReturnLoanUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Loan'))
  async create(@Body() dto: CreateLoanDto) {
    return this.createLoan.execute(dto);
  }

  @Get()
  async list(@Query() query: ListLoansQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listLoans.execute(query, user);
  }

  @Patch(':id/return')
  @CheckPolicies((ability) => ability.can('update', 'Loan'))
  async markReturned(@Param('id') id: string) {
    return this.returnLoan.execute(id);
  }
}
