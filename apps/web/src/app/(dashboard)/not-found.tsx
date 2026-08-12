import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function DashboardNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-sm space-y-3 text-center">
        <h1 className="text-lg font-semibold">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded border border-primary px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Ir al panel
        </Link>
      </Card>
    </main>
  );
}
