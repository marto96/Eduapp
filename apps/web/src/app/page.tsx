import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">EduApp</h1>
      <p className="max-w-md text-muted-foreground">
        Plataforma educativa multitenant para gestión académica y administrativa.
      </p>
      <Link
        href="/login"
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-white"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
