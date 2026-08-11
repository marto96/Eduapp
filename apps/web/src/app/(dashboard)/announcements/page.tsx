import { PublishAnnouncementForm } from '@/features/announcements/components/publish-announcement-form';
import { AnnouncementsList } from '@/features/announcements/components/announcements-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageAnnouncements } from '@/lib/permissions';

export default async function AnnouncementsPage() {
  const user = await getCurrentUser();
  const canManage = canManageAnnouncements(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comunicados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comunicados y circulares institucionales, visibles para toda la comunidad.
        </p>
      </div>

      {canManage && <PublishAnnouncementForm />}
      <AnnouncementsList />
    </main>
  );
}
