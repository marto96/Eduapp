'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StudentGradesList } from '@/features/grading/components/student-grades-list';
import { usePaymentCheckout } from '@/features/finance/use-payment-checkout';
import { chargeDisplayStatus, CHARGE_DISPLAY_STATUS_CLASSES } from '@/features/finance/charge-display-status';
import { PortalGradesChart } from './portal-grades-chart';
import { PortalAttendanceChart } from './portal-attendance-chart';
import { PortalPaymentsChart } from './portal-payments-chart';
import { formatCurrency } from '@/lib/currency';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Book,
  Charge,
  Enrollment,
  EnrollmentStatus,
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

const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Activa',
  withdrawn: 'Retirada',
  completed: 'Completada',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Otro',
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
  periodNameById,
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
  periodNameById: Map<string, string>;
  charges: Charge[];
  documents: IssuedDocument[];
  loans: Loan[];
  bookById: Map<string, Book>;
}) {
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
        <span className="text-xs uppercase text-muted-foreground">
          {ENROLLMENT_STATUS_LABELS[enrollment.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PortalGradesChart enrollmentId={enrollment.id} />
        <PortalAttendanceChart attendance={attendance} />
        <PortalPaymentsChart charges={charges} />
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
        <StudentGradesList
          scores={scores}
          evaluations={evaluations}
          subjectNameById={subjectNameById}
          periodNameById={periodNameById}
        />
      </div>

      <div>
        <p className="text-sm font-medium">Finanzas</p>
        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cargos todavía.</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {charges.map((charge) => {
              const status = chargeDisplayStatus(charge);
              return (
                <li key={charge.id} className="flex items-center justify-between gap-2">
                  <span>
                    {charge.description} — {formatCurrency(charge.paidAmount)}/{formatCurrency(charge.amount)}{' '}
                    <span className={CHARGE_DISPLAY_STATUS_CLASSES[status]}>({status})</span>
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
              );
            })}
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
