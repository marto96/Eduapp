import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

const ISSUER = 'Skolaria';

/**
 * Ventana de ±1 paso (30s) para el drift de reloj típico entre el celular
 * y el servidor — mismo criterio que recomienda RFC 6238.
 */
authenticator.options = { window: 1 };

@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  generateUri(email: string, secret: string): string {
    return authenticator.keyuri(email, ISSUER, secret);
  }

  verify(token: string, secret: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch {
      // Token con formato inválido (no numérico, longitud incorrecta) — inválido, no un error.
      return false;
    }
  }
}
