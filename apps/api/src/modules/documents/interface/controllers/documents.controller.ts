import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { IssueDocumentUseCase } from '../../application/use-cases/issue-document.use-case';
import { ListDocumentsUseCase } from '../../application/use-cases/list-documents.use-case';
import { VoidDocumentUseCase } from '../../application/use-cases/void-document.use-case';
import { GetDocumentPdfUseCase } from '../../application/use-cases/get-document-pdf.use-case';
import { IssueDocumentDto } from '../dtos/issue-document.dto';
import { ListDocumentsQueryDto } from '../dtos/list-documents-query.dto';
import { ListDocumentTypePricesUseCase } from '../../application/use-cases/list-document-type-prices.use-case';
import { SetDocumentTypePriceUseCase } from '../../application/use-cases/set-document-type-price.use-case';
import { SetDocumentTypePriceDto } from '../dtos/set-document-type-price.dto';
import { SetDocumentTypePriceParamDto } from '../dtos/set-document-type-price-param.dto';
import { RequestDocumentUseCase } from '../../application/use-cases/request-document.use-case';
import { RequestDocumentDto } from '../dtos/request-document.dto';
import { ListDocumentRequestsUseCase } from '../../application/use-cases/list-document-requests.use-case';
import { RejectDocumentRequestUseCase } from '../../application/use-cases/reject-document-request.use-case';
import { MarkDocumentRequestDeliveredUseCase } from '../../application/use-cases/mark-document-request-delivered.use-case';
import { RejectDocumentRequestDto } from '../dtos/reject-document-request.dto';
import { ListDocumentRequestsQueryDto } from '../dtos/list-document-requests-query.dto';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly issueDocument: IssueDocumentUseCase,
    private readonly listDocuments: ListDocumentsUseCase,
    private readonly voidDocument: VoidDocumentUseCase,
    private readonly getDocumentPdf: GetDocumentPdfUseCase,
    private readonly listDocumentTypePrices: ListDocumentTypePricesUseCase,
    private readonly setDocumentTypePrice: SetDocumentTypePriceUseCase,
    private readonly requestDocument: RequestDocumentUseCase,
    private readonly listDocumentRequests: ListDocumentRequestsUseCase,
    private readonly rejectDocumentRequest: RejectDocumentRequestUseCase,
    private readonly markDocumentRequestDelivered: MarkDocumentRequestDeliveredUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Document'))
  async create(@Body() dto: IssueDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.issueDocument.execute({ ...dto, issuedBy: user.sub });
  }

  @Post('requests')
  @CheckPolicies((ability) => ability.can('create', 'DocumentRequest'))
  async request(@Body() dto: RequestDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.requestDocument.execute(dto, user);
  }

  @Get('requests')
  async listRequests(@Query() query: ListDocumentRequestsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listDocumentRequests.execute(user, query.status);
  }

  @Patch('requests/:id/reject')
  @CheckPolicies((ability) => ability.can('manage', 'DocumentRequest'))
  async rejectRequest(@Param('id') id: string, @Body() dto: RejectDocumentRequestDto, @CurrentUser() user: JwtPayload) {
    return this.rejectDocumentRequest.execute(id, dto.reason, user.sub);
  }

  @Patch('requests/:id/deliver')
  @CheckPolicies((ability) => ability.can('manage', 'DocumentRequest'))
  async deliverRequest(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.markDocumentRequestDelivered.execute(id, user.sub);
  }

  @Get()
  async list(@Query() query: ListDocumentsQueryDto, @CurrentUser() user: JwtPayload) {
    const input = query.enrollmentId || query.type ? { enrollmentId: query.enrollmentId, type: query.type } : undefined;
    return this.listDocuments.execute(input, user, query.page, query.pageSize, query.search);
  }

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Document'))
  async annul(@Param('id') id: string) {
    return this.voidDocument.execute(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const buffer = await this.getDocumentPdf.execute(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${id}.pdf"`);
    res.send(buffer);
  }

  @Get('types/prices')
  async listTypePrices() {
    return this.listDocumentTypePrices.execute();
  }

  @Put('types/prices/:type')
  @CheckPolicies((ability) => ability.can('manage', 'Document'))
  async setTypePrice(@Param() params: SetDocumentTypePriceParamDto, @Body() dto: SetDocumentTypePriceDto) {
    return this.setDocumentTypePrice.execute(params.type, dto.amount);
  }
}
