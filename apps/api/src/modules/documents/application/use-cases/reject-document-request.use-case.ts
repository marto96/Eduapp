import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';

@Injectable()
export class RejectDocumentRequestUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
  ) {}

  async execute(id: string, reason: string, staffUserId: string): Promise<DocumentRequest> {
    const request = await this.documentRequests.findById(id);
    if (!request) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    try {
      request.reject(staffUserId, reason);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.documentRequests.save(request);
    return request;
  }
}
