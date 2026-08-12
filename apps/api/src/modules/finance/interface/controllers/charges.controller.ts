import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateChargeUseCase } from '../../application/use-cases/create-charge.use-case';
import { ListChargesUseCase } from '../../application/use-cases/list-charges.use-case';
import { EditChargeUseCase } from '../../application/use-cases/edit-charge.use-case';
import { VoidChargeUseCase } from '../../application/use-cases/void-charge.use-case';
import { CreatePaymentCheckoutUseCase } from '../../application/use-cases/create-payment-checkout.use-case';
import { CreateChargeDto } from '../dtos/create-charge.dto';
import { ListChargesQueryDto } from '../dtos/list-charges-query.dto';
import { EditChargeDto } from '../dtos/edit-charge.dto';

@Controller('finance/charges')
export class ChargesController {
  constructor(
    private readonly createCharge: CreateChargeUseCase,
    private readonly listCharges: ListChargesUseCase,
    private readonly editCharge: EditChargeUseCase,
    private readonly voidCharge: VoidChargeUseCase,
    private readonly createPaymentCheckout: CreatePaymentCheckoutUseCase,
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

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Finance'))
  async annul(@Param('id') id: string) {
    return this.voidCharge.execute(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Finance'))
  async edit(@Param('id') id: string, @Body() dto: EditChargeDto) {
    return this.editCharge.execute(id, dto);
  }

  // 'read', no 'create'/'update': un padre_tutor solo tiene lectura sobre
  // Finance (ver AbilityFactory) — pagar no es gestionar el cargo, la
  // privacidad real la da EnrollmentAccessService dentro del use-case.
  @Post(':id/checkout')
  @CheckPolicies((ability) => ability.can('read', 'Finance'))
  async checkout(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.createPaymentCheckout.execute(id, user);
  }
}
