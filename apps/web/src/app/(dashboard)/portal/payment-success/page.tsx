import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Pago en proceso</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Estamos confirmando el pago — el cargo se va a actualizar automáticamente en unos instantes,
        no hace falta que hagas nada más.
      </p>
      <Link href="/portal">
        <Button>Volver a Mi familia</Button>
      </Link>
    </main>
  );
}
