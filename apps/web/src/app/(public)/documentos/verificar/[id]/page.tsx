import { DocumentVerificationCard } from './document-verification-card';

export default function DocumentVerificationPage({ params }: { params: { id: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Verificación de documento</h1>
          <p className="text-sm text-muted-foreground">
            Confirmá la autenticidad de una constancia o certificado emitido por una institución.
          </p>
        </div>
        <DocumentVerificationCard id={params.id} />
      </div>
    </main>
  );
}
