import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../core/auth/public.decorator';
import { CreateAdmissionApplicationUseCase } from '../../application/use-cases/create-admission-application.use-case';
import { GetAdmissionApplicationStatusUseCase } from '../../application/use-cases/get-admission-application-status.use-case';
import { ListOpenAdmissionYearsUseCase } from '../../application/use-cases/list-open-admission-years.use-case';
import { UploadAdmissionDocumentUseCase } from '../../application/use-cases/upload-admission-document.use-case';
import { ListAdmissionDocumentsUseCase } from '../../application/use-cases/list-admission-documents.use-case';
import { CreateAdmissionApplicationDto } from '../dtos/create-admission-application.dto';
import { UploadAdmissionDocumentDto } from '../dtos/upload-admission-document.dto';

const ALLOWED_ADMISSION_DOCUMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

@Controller('admissions/applications')
@Public()
export class AdmissionPublicController {
  constructor(
    private readonly createApplication: CreateAdmissionApplicationUseCase,
    private readonly getStatus: GetAdmissionApplicationStatusUseCase,
    private readonly listOpenYears: ListOpenAdmissionYearsUseCase,
    private readonly uploadDocument: UploadAdmissionDocumentUseCase,
    private readonly listDocuments: ListAdmissionDocumentsUseCase,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateAdmissionApplicationDto) {
    return this.createApplication.execute(dto);
  }

  @Get('status/:trackingCode')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async status(@Param('trackingCode') trackingCode: string) {
    return this.getStatus.execute(trackingCode);
  }

  @Get('open-years')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async openYears() {
    return this.listOpenYears.execute();
  }

  @Post('status/:trackingCode/documents')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ALLOWED_ADMISSION_DOCUMENT_MIME_TYPES.includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Formato de archivo no soportado'), ok);
      },
    }),
  )
  async uploadDocumentEndpoint(
    @Param('trackingCode') trackingCode: string,
    @Body() dto: UploadAdmissionDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.uploadDocument.execute(trackingCode, dto.type, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
  }

  @Get('status/:trackingCode/documents')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async listDocumentsEndpoint(@Param('trackingCode') trackingCode: string) {
    return this.listDocuments.execute(trackingCode);
  }
}
