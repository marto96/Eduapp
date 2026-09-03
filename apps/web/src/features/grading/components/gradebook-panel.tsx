'use client';

import { useState } from 'react';
import { GradebookSearch } from './gradebook-search';
import { GradebookTable } from './gradebook-table';
import { SubjectPeriodDetailModal } from './subject-period-detail-modal';
import { CreateGradeModal } from './create-grade-modal';
import { Button } from '@/components/ui/button';
import type { GradeCategory } from '@eduapp/shared-types';

interface SelectedStudent {
  enrollmentId: string;
  sectionId: string;
  fullName: string;
}

interface DetailTarget {
  subjectId: string;
  periodId: string;
}

interface CreateTarget {
  subjectId: string;
  periodId: string;
  category: GradeCategory;
}

export function GradebookPanel() {
  const [student, setStudent] = useState<SelectedStudent | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);

  return (
    <div className="space-y-4">
      {!student && (
        <GradebookSearch
          onSelect={(s) => setStudent({ enrollmentId: s.enrollmentId, sectionId: s.sectionId, fullName: s.fullName })}
        />
      )}

      {student && (
        <div className="space-y-3">
          <Button variant="ghost" type="button" onClick={() => setStudent(null)}>
            ← Volver a la búsqueda
          </Button>
          <GradebookTable
            enrollmentId={student.enrollmentId}
            onViewDetail={(subjectId, periodId) => setDetailTarget({ subjectId, periodId })}
            onCreateGrade={(subjectId, periodId) =>
              setCreateTarget({ subjectId, periodId, category: 'actividad' })
            }
          />
        </div>
      )}

      <SubjectPeriodDetailModal
        enrollmentId={student?.enrollmentId ?? null}
        subjectId={detailTarget?.subjectId ?? null}
        periodId={detailTarget?.periodId ?? null}
        onClose={() => setDetailTarget(null)}
        onAddGrade={() => {
          if (!detailTarget) return;
          setCreateTarget({ subjectId: detailTarget.subjectId, periodId: detailTarget.periodId, category: 'actividad' });
          setDetailTarget(null);
        }}
      />

      <CreateGradeModal
        enrollmentId={student?.enrollmentId ?? null}
        subjectId={createTarget?.subjectId ?? null}
        sectionId={student?.sectionId ?? null}
        periodId={createTarget?.periodId ?? null}
        initialCategory={createTarget?.category ?? 'actividad'}
        onClose={() => setCreateTarget(null)}
      />
    </div>
  );
}
