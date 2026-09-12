'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { DocumentType } from '@eduapp/shared-types';
import { useDocumentVerification } from '@/features/documents/use-documents';
import { Spinner } from '@/components/ui/spinner';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Otro',
};

export function DocumentVerificationCard({ id }: { id: string }) {
  const { data, isLoading, isError } = useDocumentVerification(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-2 rounded border border-destructive/30 bg-destructive/5 p-4 text-center">
        <XCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Documento no encontrado</p>
        <p className="text-xs text-muted-foreground">
          Este enlace no corresponde a ningún documento emitido por la institución.
        </p>
      </div>
    );
  }

  if (data.voided) {
    return (
      <div className="flex flex-col items-center gap-2 rounded border border-destructive/30 bg-destructive/5 p-4 text-center">
        <XCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Documento anulado</p>
        <p className="text-xs text-muted-foreground">Este documento ya no es válido.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded border border-success/30 bg-success/5 p-4 text-center">
      <CheckCircle2 className="h-8 w-8 text-success" />
      <p className="text-sm font-medium">Documento válido</p>
      <div className="w-full space-y-1.5 border-t border-border pt-3 text-left text-sm">
        <p>
          <span className="text-muted-foreground">Institución:</span> {data.institutionName}
        </p>
        <p>
          <span className="text-muted-foreground">Tipo:</span>{' '}
          {DOCUMENT_TYPE_LABELS[data.type] ?? data.type}
        </p>
        <p>
          <span className="text-muted-foreground">Estudiante:</span> {data.studentName}
        </p>
        <p>
          <span className="text-muted-foreground">Fecha de emisión:</span> {data.issuedAt}
        </p>
      </div>
    </div>
  );
}
