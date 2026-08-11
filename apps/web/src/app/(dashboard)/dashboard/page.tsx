import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server-api';
import { Card } from '@/components/ui/card';
import { UnreadMessagesWidget } from '@/features/dashboard/components/unread-messages-widget';
import { UpcomingEventsWidget } from '@/features/dashboard/components/upcoming-events-widget';
import { RecentAnnouncementsWidget } from '@/features/dashboard/components/recent-announcements-widget';
import { QuickStatsWidget } from '@/features/dashboard/components/quick-stats-widget';
import { PendingChargesWidget } from '@/features/dashboard/components/pending-charges-widget';
import { TodayScheduleWidget } from '@/features/dashboard/components/today-schedule-widget';
import { MyLoansWidget } from '@/features/dashboard/components/my-loans-widget';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const roles = user.roles;
  const isAdmin = roles.includes('admin_institucion') || roles.includes('directivo');
  const isSecretaria = roles.includes('secretaria');
  const isDocente = roles.includes('docente');
  const isEstudiante = roles.includes('estudiante');
  const isPadre = roles.includes('padre_tutor');
  const showPendingCharges = isAdmin || isSecretaria || isPadre;

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen de tu actividad en la plataforma.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <UnreadMessagesWidget />
        {isAdmin && <QuickStatsWidget />}
        {showPendingCharges && <PendingChargesWidget />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <UpcomingEventsWidget />
        <RecentAnnouncementsWidget />
        {isDocente && <TodayScheduleWidget teacherId={user.id} />}
        {(isEstudiante || isPadre) && <MyLoansWidget />}
        {isPadre && (
          <Link href="/portal" className="block">
            <Card className="flex h-full flex-col justify-center transition-colors hover:border-primary">
              <p className="text-[10px] uppercase tracking-wide text-primary">Mi familia</p>
              <p className="mt-1 text-sm font-medium">Ver el detalle completo</p>
              <p className="text-xs text-muted-foreground">
                Asistencia, notas, finanzas y documentos de tus hijos.
              </p>
            </Card>
          </Link>
        )}
      </div>
    </main>
  );
}
