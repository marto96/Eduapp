import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { IssueDocumentUseCase } from '../../application/use-cases/issue-document.use-case';
import { ListDocumentsUseCase } from '../../application/use-cases/list-documents.use-case';
import { VoidDocumentUseCase } from '../../application/use-cases/void-document.use-case';
import { IssueDocumentDto } from '../dtos/issue-document.dto';
import { ListDocumentsQueryDto } from '../dtos/list-documents-query.dto';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly issueDocument: IssueDocumentUseCase,
    private readonly listDocuments: ListDocumentsUseCase,
    private readonly voidDocument: VoidDocumentUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Document'))
  async create(@Body() dto: IssueDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.issueDocument.execute({ ...dto, issuedBy: user.sub });
  }

  @Get()
  async list(@Query() query: ListDocumentsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listDocuments.execute(query, user);
  }

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Document'))
  async annul(@Param('id') id: string) {
    return this.voidDocument.execute(id);
  }
}
