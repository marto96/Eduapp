import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../core/auth/public.decorator';
import { VerifyIssuedDocumentUseCase } from '../../application/use-cases/verify-issued-document.use-case';

@Controller('documents/verify')
@Public()
export class DocumentVerificationPublicController {
  constructor(private readonly verifyDocument: VerifyIssuedDocumentUseCase) {}

  @Get(':id')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verify(@Param('id') id: string) {
    return this.verifyDocument.execute(id);
  }
}
