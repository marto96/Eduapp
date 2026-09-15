'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { useDocumentRequests } from '@/features/documents/use-document-requests';
import { StatCard } from '@/components/ui/stat-card';

export function DocumentRequestsWidget() {
  const { data: requests, isLoading } = useDocumentRequests('lista_para_imprimir');
  const count = requests?.length ?? 0;

  return (
    <Link href="/documents?tab=solicitudes" className="block">
      <StatCard
        icon={FileText}
        iconTone={count > 0 ? 'warning' : 'primary'}
        className={count > 0 ? 'border-warning/40' : undefined}
        label="Solicitudes de documentos"
        value={isLoading ? '…' : count}
        caption="para imprimir y entregar"
      />
    </Link>
  );
}
