import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { RecordPaymentUseCase } from '../../application/use-cases/record-payment.use-case';
import { ListPaymentsUseCase } from '../../application/use-cases/list-payments.use-case';
import { RecordPaymentDto } from '../dtos/record-payment.dto';
import { ListPaymentsQueryDto } from '../dtos/list-payments-query.dto';

@Controller('finance/payments')
export class PaymentsController {
  constructor(
    private readonly recordPayment: RecordPaymentUseCase,
    private readonly listPayments: ListPaymentsUseCase,
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
}
