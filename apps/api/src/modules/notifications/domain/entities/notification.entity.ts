export class Notification {
  constructor(
    public readonly id: string,
    public readonly recipientUserId: string,
    public readonly type: string,
    public readonly title: string,
    public readonly body: string,
    public readonly link: string,
    public readonly createdAt: string,
    public readAt: string | null = null,
  ) {}

  markRead(): void {
    if (!this.readAt) {
      this.readAt = new Date().toISOString();
    }
  }
}
