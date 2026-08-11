import { IssueDocumentForm } from '@/features/documents/components/issue-document-form';
import { DocumentsList } from '@/features/documents/components/documents-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageDocuments } from '@/lib/permissions';

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  const canManage = canManageDocuments(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Constancias y certificados emitidos por estudiante.
        </p>
      </div>

      {canManage && <IssueDocumentForm />}
      <DocumentsList />
    </main>
  );
}
