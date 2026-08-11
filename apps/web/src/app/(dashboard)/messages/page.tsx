import { redirect } from 'next/navigation';
import { MessagesView } from '@/features/messages/components/messages-view';
import { getCurrentUser } from '@/lib/server-api';

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mensajes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversaciones privadas con otros miembros de la institución.
        </p>
      </div>

      <MessagesView currentUserId={user.id} />
    </main>
  );
}
