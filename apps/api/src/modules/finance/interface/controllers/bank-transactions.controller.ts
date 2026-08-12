import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ImportBankTransactionsUseCase } from '../../application/use-cases/import-bank-transactions.use-case';
import { ListBankTransactionsUseCase } from '../../application/use-cases/list-bank-transactions.use-case';
import { MatchBankTransactionUseCase } from '../../application/use-cases/match-bank-transaction.use-case';
import { ListBankTransactionsQueryDto } from '../dtos/list-bank-transactions-query.dto';
import { MatchBankTransactionDto } from '../dtos/match-bank-transaction.dto';

@Controller('finance/bank-transactions')
export class BankTransactionsController {
  constructor(
    private readonly importBankTransactions: ImportBankTransactionsUseCase,
    private readonly listBankTransactions: ListBankTransactionsUseCase,
    private readonly matchBankTransaction: MatchBankTransactionUseCase,
  ) {}

  @Post('import')
  @CheckPolicies((ability) => ability.can('manage', 'Finance'))
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1024 * 1024 } }))
  async import(@UploadedFile() file: Express.Multer.File) {
    return this.importBankTransactions.execute(file.buffer.toString('utf-8'));
  }

  @Get()
  @CheckPolicies((ability) => ability.can('manage', 'Finance'))
  async list(@Query() query: ListBankTransactionsQueryDto) {
    return this.listBankTransactions.execute({ matched: query.matched });
  }

  @Patch(':id/match')
  @CheckPolicies((ability) => ability.can('manage', 'Finance'))
  async match(@Param('id') id: string, @Body() dto: MatchBankTransactionDto) {
    return this.matchBankTransaction.execute(id, dto.paymentId);
  }
}
