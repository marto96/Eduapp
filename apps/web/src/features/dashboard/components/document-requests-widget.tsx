'use client';

import Link from 'next/link';
import { useDocumentRequests } from '@/features/documents/use-document-requests';
import { Card } from '@/components/ui/card';

export function DocumentRequestsWidget() {
  const { data: requests, isLoading } = useDocumentRequests('lista_para_imprimir');
  const count = requests?.length ?? 0;

  return (
    <Link href="/documents?tab=solicitudes" className="block">
      <Card className={count > 0 ? 'border-warning/40' : undefined}>
        <p className="text-[10px] uppercase tracking-wide text-primary">Solicitudes de documentos</p>
        <p className="mt-1 text-2xl font-medium">{isLoading ? '…' : count}</p>
        <p className="text-xs text-muted-foreground">para imprimir y entregar</p>
      </Card>
    </Link>
  );
}
