import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { FinancialModelCalculator } from '@/components/internal/financial-model-calculator';
import { PasswordGate } from './password-gate';
import { MODELO_2027_COOKIE, expectedToken } from './password';

export const metadata: Metadata = {
  title: 'Skolaria',
  robots: { index: false, follow: false, nocache: true },
};

export default function ModeloFinancieroPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const unlocked = cookies().get(MODELO_2027_COOKIE)?.value === expectedToken();

  if (!unlocked) {
    return <PasswordGate error={searchParams.error === '1'} />;
  }

  return <FinancialModelCalculator />;
}
