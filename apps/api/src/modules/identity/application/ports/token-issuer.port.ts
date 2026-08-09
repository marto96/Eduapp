import { User } from '../../domain/entities/user.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export abstract class TokenIssuerPort {
  abstract issueTokenPair(user: User): Promise<TokenPair>;
}
