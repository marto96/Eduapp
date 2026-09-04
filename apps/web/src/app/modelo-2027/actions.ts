'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MODELO_2027_COOKIE, MODELO_2027_PASSWORD, expectedToken } from './password';

export async function unlockModelo2027(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');

  if (password !== MODELO_2027_PASSWORD) {
    redirect('/modelo-2027?error=1');
  }

  cookies().set(MODELO_2027_COOKIE, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/modelo-2027',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect('/modelo-2027');
}
