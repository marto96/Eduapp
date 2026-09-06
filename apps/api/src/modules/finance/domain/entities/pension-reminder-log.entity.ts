export class PensionReminderLog {
  constructor(
    public readonly id: string,
    public readonly chargeId: string,
    public readonly sentAt: string,
  ) {}
}
