import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { FileStoragePort, StoredFile } from '../../../../core/storage/file-storage.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class AddMessageAttachmentUseCase {
  constructor(
    @Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(id: string, file: StoredFile, currentUser: JwtPayload): Promise<Message> {
    const message = await this.messages.findById(id);
    if (!message) {
      throw new NotFoundException(`No existe el mensaje "${id}"`);
    }
    if (message.senderId !== currentUser.sub) {
      throw new ForbiddenException('Solo el remitente puede adjuntar un archivo');
    }

    const key = await this.storage.save('messages', `${id}-${file.originalname}`, file, 'private');
    message.attachmentUrl = key;
    message.attachmentName = file.originalname;
    await this.messages.save(message);
    return message;
  }
}
