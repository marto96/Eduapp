import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como accesible sin access token (login, refresh). El guard
 * global `JwtAuthGuard` la deja pasar sin intentar validar Authorization.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
