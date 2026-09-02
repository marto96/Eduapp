import { AdmissionStatusLookup } from './admission-status-lookup';

export default function AdmissionStatusPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Consultar solicitud</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá el código de seguimiento que recibiste al enviar tu solicitud.
          </p>
        </div>
        <AdmissionStatusLookup />
      </div>
    </main>
  );
}
