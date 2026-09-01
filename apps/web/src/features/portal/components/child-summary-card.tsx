'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePaymentCheckout } from '@/features/finance/use-payment-checkout';
import { formatCurrency } from '@/lib/currency';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Book,
  Charge,
  Enrollment,
  Evaluation,
  GradeScore,
  IssuedDocument,
  Loan,
} from '@eduapp/shared-types';

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  tarde: 'Tarde',
  justificado: 'Justificado',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Otro',
};

const STATUS_CLASSES: Record<string, string> = {
  pendiente: 'text-destructive',
  parcial: 'text-foreground',
  pagado: 'text-muted-foreground',
};

export function ChildSummaryCard({
  enrollment,
  studentName,
  sectionName,
  yearName,
  attendance,
  scores,
  evaluations,
  subjectNameById,
  charges,
  documents,
  loans,
  bookById,
}: {
  enrollment: Enrollment;
  studentName?: string;
  sectionName?: string;
  yearName?: string;
  attendance: AttendanceRecord[];
  scores: GradeScore[];
  evaluations: Evaluation[];
  subjectNameById: Map<string, string>;
  charges: Charge[];
  documents: IssuedDocument[];
  loans: Loan[];
  bookById: Map<string, Book>;
}) {
  const evaluationById = new Map(evaluations.map((e) => [e.id, e]));
  const sortedAttendance = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
  const checkout = usePaymentCheckout();

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{studentName ?? 'Mi matrícula'}</p>
          <p className="text-sm text-muted-foreground">
            {yearName ?? enrollment.academicYearId} — Sección{' '}
            {sectionName ?? enrollment.sectionId}
          </p>
        </div>
        <span className="text-xs uppercase text-muted-foreground">{enrollment.status}</span>
      </div>

      <div>
        <p className="text-sm font-medium">Asistencia</p>
        {sortedAttendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {sortedAttendance.map((record) => (
              <li key={record.id}>
                {record.date}: {ATTENDANCE_LABELS[record.status]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">Notas</p>
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin notas todavía.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {scores.map((score) => {
              const evaluation = evaluationById.get(score.evaluationId);
              return (
                <li key={score.id}>
                  {evaluation
                    ? `${subjectNameById.get(evaluation.subjectId) ?? evaluation.subjectId} — ${evaluation.period} (${evaluation.type})`
                    : score.evaluationId}
                  : {score.score}
                  {evaluation ? `/${evaluation.maxScore}` : ''}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">Finanzas</p>
        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cargos todavía.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {charges.map((charge) => (
              <li key={charge.id} className="flex items-center justify-between gap-2">
                <span>
                  {charge.description} — {formatCurrency(charge.paidAmount)}/{formatCurrency(charge.amount)}{' '}
                  <span className={STATUS_CLASSES[charge.status]}>({charge.status})</span>
                </span>
                {(charge.status === 'pendiente' || charge.status === 'parcial') && (
                  <Button
                    variant="secondary"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate(charge.id)}
                  >
                    Pagar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">Documentos</p>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin documentos emitidos.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {documents.map((doc) => (
              <li key={doc.id}>
                {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} — {doc.issuedAt}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">Préstamos</p>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin préstamos de biblioteca.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {loans.map((loan) => (
              <li key={loan.id}>
                {bookById.get(loan.bookId)?.title ?? loan.bookId} — vence {loan.dueDate}{' '}
                <span className={loan.returnedAt ? 'text-muted-foreground' : 'text-foreground'}>
                  ({loan.returnedAt ? 'devuelto' : 'activo'})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
