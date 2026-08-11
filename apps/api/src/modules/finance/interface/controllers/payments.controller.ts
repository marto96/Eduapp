import { Controller, Get, Param, Patch, Post, Body, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { RecordPaymentUseCase } from '../../application/use-cases/record-payment.use-case';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.use-case';
import { VoidPaymentUseCase } from '../../application/use-cases/void-payment.use-case';
import { RecordPaymentDto } from '../dtos/record-payment.dto';
import { ListPaymentsQueryDto } from '../dtos/list-payments-query.dto';

@Controller('finance/payments')
export class PaymentsController {
  constructor(
    private readonly recordPayment: RecordPaymentUseCase,
    private readonly listPayments: ListPaymentsUseCase,
    private readonly voidPayment: VoidPaymentUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Finance'))
  async create(@Body() dto: RecordPaymentDto) {
    return this.recordPayment.execute(dto);
  }

  @Get()
  async list(@Query() query: ListPaymentsQueryDto) {
    return this.listPayments.execute(query);
  }

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Finance'))
  async annul(@Param('id') id: string) {
    return this.voidPayment.execute(id);
  }
}
