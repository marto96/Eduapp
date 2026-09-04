import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * `new URLSearchParams(obj)` serializa TODAS las propiedades del objeto,
 * `undefined` incluido — `String(undefined)` da el string literal
 * `"undefined"`, que termina viajando como filtro real (ej.
 * `?search=undefined`). Esto arma el query string salteando los campos
 * `undefined`/`null`/string vacío.
 */
export function toQueryString(params: object): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.set(key, String(value));
  }
  return usp.toString();
}
