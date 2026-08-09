import type { AuthenticatedUser, AuthTokens } from '@eduapp/shared-types';

export interface EduAppApiClientConfig {
  baseUrl: string;
}

export class EduAppApiClient {
  constructor(private readonly config: EduAppApiClientConfig) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const res = await fetch(`${this.config.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login fallido');
    return res.json();
  }

  async me(_accessToken: string): Promise<AuthenticatedUser> {
    throw new Error('Pendiente: endpoint /auth/me en el backend');
  }
}
