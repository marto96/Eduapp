import { redirect } from 'next/navigation';
import { EmailTemplatesView } from '@/features/email-templates/email-templates-view';
import { getCurrentUser } from '@/lib/server-api';
import { canManageEmailTemplates } from '@/lib/permissions';

export default async function EmailTemplatesPage() {
  const user = await getCurrentUser();
  if (!canManageEmailTemplates(user?.roles ?? [])) {
    redirect('/dashboard');
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantillas de correo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalizá el texto de los correos automáticos de admisiones y pagos.
        </p>
      </div>
      <EmailTemplatesView />
    </main>
  );
}
