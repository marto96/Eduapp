import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateChargeUseCase } from '../../application/use-cases/create-charge.use-case';
import { ListChargesUseCase } from '../../application/use-cases/list-charges.use-case';
import { CreateChargeDto } from '../dtos/create-charge.dto';
import { ListChargesQueryDto } from '../dtos/list-charges-query.dto';

@Controller('finance/charges')
export class ChargesController {
  constructor(
    private readonly createCharge: CreateChargeUseCase,
    private readonly listCharges: ListChargesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Finance'))
  async create(@Body() dto: CreateChargeDto) {
    return this.createCharge.execute(dto);
  }

  @Get()
  async list(@Query() query: ListChargesQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listCharges.execute(query, user);
  }
}
