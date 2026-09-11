'use client';

import { useState } from 'react';
import type { GuardianLinkCandidate } from '@eduapp/shared-types';
import { useMyGuardianLinks, useRequestGuardianLink } from '@/features/users/use-guardians';
import { useUsers } from '@/features/users/use-users';
import { StudentSearchCombobox } from '@/features/users/components/student-search-combobox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';

export function RequestGuardianLinkForm() {
  const { data: myLinks } = useMyGuardianLinks();
  const { data: students } = useUsers('estudiante');
  const requestLink = useRequestGuardianLink();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<GuardianLinkCandidate | null>(null);

  const studentNameById = new Map(students?.map((u) => [u.id, u.fullName]));
  const links = myLinks ?? [];
  const pendingLinks = links.filter((l) => l.status === 'pending');
  const linkedStudentIds = new Set(links.map((l) => l.studentUserId));

  function handleClose() {
    setIsOpen(false);
    setSelected(null);
  }

  function handleSubmit() {
    if (!selected) return;
    requestLink.mutate({ studentUserId: selected.id }, { onSuccess: handleClose });
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Vincular con mi hijo/a</h2>
          <p className="text-sm text-muted-foreground">
            La solicitud queda pendiente hasta que la institución la apruebe.
          </p>
        </div>
        <Button type="button" onClick={() => setIsOpen(true)}>
          Vincular
        </Button>
      </div>

      {links.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-sm">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-2">
              <span
                className={
                  link.status === 'approved'
                    ? 'rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success'
                    : 'rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning'
                }
              >
                {link.status === 'approved' ? 'Aprobado' : 'Pendiente'}
              </span>
              <span className="text-muted-foreground">
                {studentNameById.get(link.studentUserId) ?? link.studentUserId}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isOpen} onClose={handleClose} title="Vincular con mi hijo/a">
        <div className="space-y-4">
          <StudentSearchCombobox
            selected={selected}
            onSelect={setSelected}
            onClear={() => setSelected(null)}
            excludeIds={linkedStudentIds}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={!selected || requestLink.isPending} onClick={handleSubmit}>
              {requestLink.isPending ? 'Enviando...' : 'Solicitar vínculo'}
            </Button>
          </div>
          {requestLink.isError && (
            <p className="text-sm text-destructive">No se pudo enviar la solicitud (¿ya existe ese vínculo?).</p>
          )}
        </div>
      </Dialog>
    </Card>
  );
}
