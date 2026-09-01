'use client';

import { ChangeEvent, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency } from '@/lib/currency';
import {
  useBankTransactions,
  useAllPayments,
  useImportBankTransactions,
  useMatchBankTransaction,
} from '../use-bank-transactions';

// Ambas listas son una cola de trabajo (se espera que se vacíen a medida
// que se concilia), no un histórico que crezca sin límite como los cargos
// — por eso la paginación es client-side sobre lo ya filtrado, sin tocar
// el backend (a diferencia de ChargesList, donde `status` es un campo
// derivado y paginar en memoria del lado del cliente sería más caro).
const PAGE_SIZE = 10;

export function BankReconciliation() {
  const { data: transactions } = useBankTransactions();
  const { data: payments } = useAllPayments();
  const importTransactions = useImportBankTransactions();
  const matchTransaction = useMatchBankTransaction();
  const [file, setFile] = useState<File | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const unmatchedTransactions = (transactions ?? []).filter((t) => !t.matchedPaymentId);
  const matchedPaymentIds = new Set((transactions ?? []).map((t) => t.matchedPaymentId).filter(Boolean));
  const unmatchedPayments = (payments ?? []).filter((p) => !p.voidedAt && !matchedPaymentIds.has(p.id));

  const visibleTransactions = unmatchedTransactions.slice(
    (transactionsPage - 1) * PAGE_SIZE,
    transactionsPage * PAGE_SIZE,
  );
  const visiblePayments = unmatchedPayments.slice((paymentsPage - 1) * PAGE_SIZE, paymentsPage * PAGE_SIZE);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function handleImport() {
    if (!file) return;
    importTransactions.mutate(file, { onSuccess: () => setFile(null) });
  }

  function handleMatch(paymentId: string) {
    if (!selectedTransactionId) return;
    matchTransaction.mutate(
      { id: selectedTransactionId, paymentId },
      { onSuccess: () => setSelectedTransactionId(null) },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="text-sm text-muted-foreground"
        />
        <Button type="button" disabled={!file || importTransactions.isPending} onClick={handleImport}>
          {importTransactions.isPending ? 'Importando...' : 'Importar extracto (CSV)'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Formato: primera fila header, luego filas <code>fecha,monto,descripción</code>.
      </p>
      {importTransactions.isError && (
        <p className="text-sm text-destructive">No se pudo importar el archivo.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Transacciones sin conciliar</h3>
          {unmatchedTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendiente.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {visibleTransactions.map((t) => (
                  <Card
                    key={t.id}
                    className={`flex cursor-pointer items-center justify-between py-2 ${
                      selectedTransactionId === t.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedTransactionId(t.id)}
                  >
                    <div>
                      <p className="text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(t.amount)}</span>
                  </Card>
                ))}
              </ul>
              <Pagination
                page={transactionsPage}
                pageSize={PAGE_SIZE}
                total={unmatchedTransactions.length}
                onPageChange={setTransactionsPage}
              />
            </>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Pagos sin conciliar {selectedTransactionId && '— elegí uno para vincular'}
          </h3>
          {unmatchedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendiente.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {visiblePayments.map((p) => (
                  <Card key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm">{p.method}</p>
                      <p className="text-xs text-muted-foreground">{p.paidAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                      {selectedTransactionId && (
                        <Button
                          variant="secondary"
                          disabled={matchTransaction.isPending}
                          onClick={() => handleMatch(p.id)}
                        >
                          Vincular
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </ul>
              <Pagination
                page={paymentsPage}
                pageSize={PAGE_SIZE}
                total={unmatchedPayments.length}
                onPageChange={setPaymentsPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
