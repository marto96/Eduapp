export class GuardianLink {
  constructor(
    public readonly id: string,
    public readonly guardianUserId: string,
    public readonly studentUserId: string,
  ) {}
}
