export class Message {
  constructor(
    public readonly id: string,
    public readonly senderId: string,
    public readonly recipientId: string,
    public readonly body: string,
    public readonly sentAt: string,
    public readAt: string | null,
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
}
