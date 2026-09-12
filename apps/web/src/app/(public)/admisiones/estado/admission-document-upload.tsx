'use client';

import { useRef, useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import type { AdmissionDocumentType } from '@eduapp/shared-types';
import { useAdmissionDocuments, useUploadAdmissionDocument } from '@/features/admissions/use-admissions';
import { Button } from '@/components/ui/button';

const DOCUMENT_TYPES: { value: AdmissionDocumentType; label: string }[] = [
  { value: 'partida_nacimiento', label: 'Registro civil / partida de nacimiento' },
  { value: 'documento_identidad_estudiante', label: 'Documento de identidad del estudiante' },
  { value: 'documento_identidad_acudiente', label: 'Documento de identidad del acudiente' },
  { value: 'foto', label: 'Foto' },
];

/**
 * Sin firma electrónica — solo carga y archivo de soportes. El tracking
 * code es la credencial (mismo modelo que la consulta de estado); volver
 * a subir el mismo tipo reemplaza el archivo anterior.
 */
export function AdmissionDocumentUpload({ trackingCode }: { trackingCode: string }) {
  const { data: documents } = useAdmissionDocuments(trackingCode);
  const uploadDocument = useUploadAdmissionDocument();
  const [uploadingType, setUploadingType] = useState<AdmissionDocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadedTypes = new Set(documents?.map((d) => d.type));

  function handleFileChange(type: AdmissionDocumentType, file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadingType(type);
    uploadDocument.mutate(
      { trackingCode, type, file },
      {
        onSettled: () => setUploadingType(null),
        onError: (err) => setError(err instanceof Error ? err.message : 'No se pudo subir el archivo'),
      },
    );
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm font-medium">Documentos de soporte</p>
      <p className="text-xs text-muted-foreground">
        Formatos aceptados: PDF, JPG, PNG. Máx. 5 MB por archivo. Subir uno nuevo reemplaza el anterior.
      </p>
      <ul className="space-y-2">
        {DOCUMENT_TYPES.map((docType) => {
          const uploaded = uploadedTypes.has(docType.value);
          const isUploading = uploadingType === docType.value;
          return (
            <li key={docType.value} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                {uploaded && <CheckCircle2 className="h-4 w-4 text-success" />}
                {docType.label}
              </span>
              <input
                ref={(el) => {
                  inputRefs.current[docType.value] = el;
                }}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(docType.value, e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={isUploading}
                onClick={() => inputRefs.current[docType.value]?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {isUploading ? 'Subiendo...' : uploaded ? 'Reemplazar' : 'Subir'}
              </Button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
