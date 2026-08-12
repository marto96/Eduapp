import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface MessageAttachment {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class GetMessageAttachmentUseCase {
  constructor(
    @Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(id: string, currentUser: JwtPayload): Promise<MessageAttachment> {
    const message = await this.messages.findById(id);
    if (!message || !message.attachmentUrl) {
      throw new NotFoundException('Este mensaje no tiene un adjunto');
    }
    if (message.senderId !== currentUser.sub && message.recipientId !== currentUser.sub) {
      throw new ForbiddenException('No tenés acceso a este mensaje');
    }

    const [category, ...rest] = message.attachmentUrl.split('/');
    const buffer = await this.storage.read(category, rest.join('/'));
    return { buffer, filename: message.attachmentName ?? 'adjunto' };
  }
}
