'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EnrollmentReportView } from './enrollment-report-view';
import { AttendanceReportView } from './attendance-report-view';
import { FinanceReportView } from './finance-report-view';
import { ReportCardView } from './report-card-view';

type Tab = 'enrollment' | 'attendance' | 'finance' | 'report-cards';

export function ReportsTabs({
  canViewInstitutional,
  canViewReportCards,
}: {
  canViewInstitutional: boolean;
  canViewReportCards: boolean;
}) {
  const tabs: { id: Tab; label: string }[] = [
    ...(canViewInstitutional
      ? ([
          { id: 'enrollment', label: 'Matrícula' },
          { id: 'attendance', label: 'Asistencia' },
          { id: 'finance', label: 'Finanzas' },
        ] as const)
      : []),
    ...(canViewReportCards ? ([{ id: 'report-cards', label: 'Boletines' }] as const) : []),
  ];

  const [activeTab, setActiveTab] = useState<Tab | null>(tabs[0]?.id ?? null);

  if (tabs.length === 0) {
    return <p className="text-sm text-muted-foreground">No tenés acceso a ningún reporte.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2 text-sm transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'enrollment' && <EnrollmentReportView />}
      {activeTab === 'attendance' && <AttendanceReportView />}
      {activeTab === 'finance' && <FinanceReportView />}
      {activeTab === 'report-cards' && <ReportCardView />}
    </div>
  );
}
