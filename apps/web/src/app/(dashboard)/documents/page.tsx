'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IssueDocumentForm } from '@/features/documents/components/issue-document-form';
import { DocumentsList } from '@/features/documents/components/documents-list';
import { DocumentRequestsQueue } from '@/features/documents/components/document-requests-queue';
import { DocumentTypePricesForm } from '@/features/documents/components/document-type-prices-form';
import { useMyProfile } from '@/features/profile/use-profile';
import { canManageDocuments } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const { data: user } = useMyProfile();
  const canManage = canManageDocuments(user?.roles ?? []);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<'documentos' | 'solicitudes' | 'precios'>(
    initialTab === 'solicitudes' || initialTab === 'precios' ? initialTab : 'documentos',
  );

  const tabs = canManage
    ? ([
        { key: 'documentos' as const, label: 'Documentos' },
        { key: 'solicitudes' as const, label: 'Solicitudes' },
        { key: 'precios' as const, label: 'Precios' },
      ])
    : ([{ key: 'documentos' as const, label: 'Documentos' }]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Constancias y certificados emitidos por estudiante.
        </p>
      </div>

      {canManage && (
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'documentos' && (
        <>
          {canManage && <IssueDocumentForm />}
          <DocumentsList canManage={canManage} />
        </>
      )}
      {tab === 'solicitudes' && canManage && <DocumentRequestsQueue />}
      {tab === 'precios' && canManage && <DocumentTypePricesForm />}
    </main>
  );
}
