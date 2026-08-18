'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useIssueDocument } from '../use-documents';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todayLocalDate } from '@/lib/date';
import type { DocumentType } from '@eduapp/shared-types';

const TYPES: { value: DocumentType; label: string }[] = [
  { value: 'constancia_matricula', label: 'Constancia de matrícula' },
  { value: 'certificado_notas', label: 'Certificado de notas' },
  { value: 'constancia_buena_conducta', label: 'Constancia de buena conducta' },
  { value: 'otro', label: 'Otro' },
];

export function IssueDocumentForm() {
  const { data: enrollments } = useEnrollments();
  const { data: students } = useUsers('estudiante');
  const { data: sections } = useSections();
  const issueDocument = useIssueDocument();

  const [enrollmentId, setEnrollmentId] = useState('');
  const [type, setType] = useState<DocumentType>('constancia_matricula');
  const [description, setDescription] = useState('');
  const [issuedAt, setIssuedAt] = useState(todayLocalDate);

  const studentNameById = useMemo(() => new Map(students?.map((s) => [s.id, s.fullName])), [students]);
  const sectionNameById = useMemo(() => new Map(sections?.map((s) => [s.id, s.name])), [sections]);
  const activeEnrollments = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'active'),
    [enrollments],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !description || !issuedAt) return;
    issueDocument.mutate(
      { enrollmentId, type, description, issuedAt },
      { onSuccess: () => setDescription('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="enrollmentId">Matrícula</Label>
        <select
          id="enrollmentId"
          required
          value={enrollmentId}
          onChange={(e) => setEnrollmentId(e.target.value)}
          className="flex h-10 w-64 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Seleccioná un estudiante
          </option>
          {activeEnrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>
              {studentNameById.get(enrollment.studentId) ?? enrollment.studentId} — Sección{' '}
              {sectionNameById.get(enrollment.sectionId) ?? enrollment.sectionId}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          placeholder="Para trámite de beca"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="issuedAt">Fecha</Label>
        <Input
          id="issuedAt"
          type="date"
          className="w-40"
          value={issuedAt}
          onChange={(e) => setIssuedAt(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={issueDocument.isPending}>
        {issueDocument.isPending ? 'Emitiendo...' : 'Emitir documento'}
      </Button>
      {issueDocument.isError && (
        <p className="w-full text-sm text-destructive">No se pudo emitir el documento.</p>
      )}
    </form>
  );
}
