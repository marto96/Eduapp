'use client';

import { useDocuments } from '../use-documents';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';

const TYPE_LABELS: Record<string, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Otro',
};

export function DocumentsList() {
  const { data: documents, isLoading, error } = useDocuments();
  const { data: enrollments } = useEnrollments();
  const { data: users } = useUsers();
  const { data: sections } = useSections();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los documentos.</p>;
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay documentos emitidos.</p>;
  }

  const enrollmentById = new Map(enrollments?.map((e) => [e.id, e]));
  const userNameById = new Map(users?.map((u) => [u.id, u.fullName]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  return (
    <ul className="space-y-2">
      {documents.map((document) => {
        const enrollment = enrollmentById.get(document.enrollmentId);
        const studentName = enrollment
          ? (userNameById.get(enrollment.studentId) ?? enrollment.studentId)
          : document.enrollmentId;
        const sectionName = enrollment ? sectionNameById.get(enrollment.sectionId) : undefined;

        return (
          <Card key={document.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">
                {TYPE_LABELS[document.type] ?? document.type} — {studentName}
                {sectionName ? ` (Sección ${sectionName})` : ''}
              </p>
              <p className="text-sm text-muted-foreground">{document.description}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{document.issuedAt}</p>
              <p>{userNameById.get(document.issuedBy) ?? document.issuedBy}</p>
            </div>
          </Card>
        );
      })}
    </ul>
  );
}
