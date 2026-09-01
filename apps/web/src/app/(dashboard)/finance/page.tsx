import { FinanceTabs } from '@/features/finance/components/finance-tabs';
import { getCurrentUser } from '@/lib/server-api';
import { canManageFinance } from '@/lib/permissions';

export default async function FinancePage() {
  const user = await getCurrentUser();
  const canManage = canManageFinance(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargos (matrícula, pensiones) y pagos por estudiante.
        </p>
      </div>

      <FinanceTabs canManage={canManage} />
    </main>
  );
}
