export class Message {
  constructor(
    public readonly id: string,
    public readonly senderId: string,
    public readonly recipientId: string,
    public body: string,
    public readonly sentAt: string,
    public readAt: string | null,
    public editedAt: string | null = null,
    public attachmentUrl: string | null = null,
    public attachmentName: string | null = null,
  ) {
    if (!body.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }
    if (senderId === recipientId) {
      throw new Error('No podés enviarte un mensaje a vos mismo');
    }
  }

  markRead(): void {
    if (this.readAt) return;
    this.readAt = new Date().toISOString();
  }

  edit(newBody: string): void {
    if (!newBody.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }
    this.body = newBody;
    this.editedAt = new Date().toISOString();
  }
}
