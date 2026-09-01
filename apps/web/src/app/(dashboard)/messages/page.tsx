import { redirect } from 'next/navigation';
import { MessagesView } from '@/features/messages/components/messages-view';
import { getCurrentUser } from '@/lib/server-api';

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="space-y-6 p-6">
      

      <MessagesView currentUserId={user.id} />
    </main>
  );
}
