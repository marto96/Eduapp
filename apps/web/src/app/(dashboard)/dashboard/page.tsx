import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server-api';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Hola, {user.fullName} ({user.roles.join(', ')}).
      </p>
    </main>
  );
}
