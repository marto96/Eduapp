import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PaymentFailurePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">No se pudo completar el pago</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        El pago no se procesó. Podés intentarlo de nuevo desde Mi familia.
      </p>
      <Link href="/portal">
        <Button>Volver a Mi familia</Button>
      </Link>
    </main>
  );
}
