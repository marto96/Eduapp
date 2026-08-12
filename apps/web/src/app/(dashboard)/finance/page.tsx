import { CreateChargeForm } from '@/features/finance/components/create-charge-form';
import { ChargesList } from '@/features/finance/components/charges-list';
import { BankReconciliation } from '@/features/finance/components/bank-reconciliation';
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

      {canManage && <CreateChargeForm />}
      <ChargesList canManage={canManage} />

      {canManage && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Conciliación bancaria</h2>
          <BankReconciliation />
        </section>
      )}
    </main>
  );
}
