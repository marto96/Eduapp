'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error inesperado al cargar esta página. Podés reintentar o volver al panel.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="secondary" onClick={() => reset()}>
            Reintentar
          </Button>
          <Button onClick={() => router.push('/dashboard')}>Ir al panel</Button>
        </div>
      </Card>
    </main>
  );
}
