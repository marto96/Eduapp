import { CreateEventForm } from '@/features/events/components/create-event-form';
import { EventsList } from '@/features/events/components/events-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageEvents } from '@/lib/permissions';

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const canManage = canManageEvents(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Eventos institucionales, visibles para toda la comunidad.
        </p>
      </div>

      {canManage && <CreateEventForm />}
      <EventsList />
    </main>
  );
}
