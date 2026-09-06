import { EmailTemplatesView } from '@/features/email-templates/email-templates-view';

export default function EmailTemplatesPage() {
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
