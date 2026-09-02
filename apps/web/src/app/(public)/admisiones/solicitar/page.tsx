import { AdmissionApplicationForm } from './admission-application-form';

export default function AdmissionApplyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Solicitud de admisión</h1>
          <p className="text-sm text-muted-foreground">
            Completá los datos del aspirante. Al enviar, te vamos a redirigir a la pasarela de pago de
            la cuota de solicitud.
          </p>
        </div>
        <AdmissionApplicationForm />
      </div>
    </main>
  );
}
