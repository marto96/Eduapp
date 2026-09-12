'use client';

import type { AdmissionDocumentType } from '@eduapp/shared-types';
import { useAdmissionDocumentsForReview } from '../use-admissions';

const DOCUMENT_TYPE_LABELS: Record<AdmissionDocumentType, string> = {
  partida_nacimiento: 'Registro civil',
  documento_identidad_estudiante: 'Doc. identidad estudiante',
  documento_identidad_acudiente: 'Doc. identidad acudiente',
  foto: 'Foto',
};

/** Solo se muestra si el aspirante ya subió al menos un soporte. */
export function AdmissionDocumentsSection({ applicationId }: { applicationId: string }) {
  const { data: documents } = useAdmissionDocumentsForReview(applicationId);

  if (!documents || documents.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs">
      <span className="text-muted-foreground">Documentos:</span>
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={`/api/admissions/management/${applicationId}/documents/${doc.type}`}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-muted px-2 py-1 text-primary underline hover:no-underline"
        >
          {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
        </a>
      ))}
    </div>
  );
}
