export type GuardianLinkStatus = 'pending' | 'approved';

export class GuardianLink {
  constructor(
    public readonly id: string,
    public readonly guardianUserId: string,
    public readonly studentUserId: string,
    public status: GuardianLinkStatus = 'approved',
  ) {}

  approve(): void {
    this.status = 'approved';
  }
}
