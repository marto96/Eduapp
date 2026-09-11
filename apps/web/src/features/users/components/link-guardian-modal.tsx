'use client';

import { useState } from 'react';
import type { GuardianLinkCandidate } from '@eduapp/shared-types';
import { useGuardians, useLinkGuardian, useApproveGuardianLink } from '../use-guardians';
import { useUsers } from '../use-users';
import { StudentSearchCombobox } from './student-search-combobox';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function LinkGuardianModal({
  guardianUserId,
  guardianName,
  onClose,
}: {
  guardianUserId: string | null;
  guardianName: string;
  onClose: () => void;
}) {
  const { data: students } = useUsers('estudiante');
  const { data: links } = useGuardians();
  const linkGuardian = useLinkGuardian();
  const approveGuardianLink = useApproveGuardianLink();

  const [selected, setSelected] = useState<GuardianLinkCandidate | null>(null);

  const studentNameById = new Map(students?.map((u) => [u.id, u.fullName]));
  const guardianLinks = links?.filter((l) => l.guardianUserId === guardianUserId) ?? [];
  const linkedStudentIds = new Set(guardianLinks.map((l) => l.studentUserId));

  function handleSubmit() {
    if (!guardianUserId || !selected) return;
    linkGuardian.mutate({ guardianUserId, studentUserId: selected.id }, { onSuccess: () => setSelected(null) });
  }

  function handleClose() {
    setSelected(null);
    onClose();
  }

  return (
    <Dialog open={!!guardianUserId} onClose={handleClose} title={`Vínculos de ${guardianName}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Un padre/tutor vinculado solo ve la asistencia y las notas de sus hijos, no las de todo el
          resto de la institución.
        </p>

        {guardianLinks.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {guardianLinks.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-2">
                <span>
                  {studentNameById.get(link.studentUserId) ?? link.studentUserId}{' '}
                  {link.status === 'pending' && (
                    <span className="text-xs uppercase text-muted-foreground">Pendiente</span>
                  )}
                </span>
                {link.status === 'pending' && (
                  <Button
                    variant="ghost"
                    disabled={approveGuardianLink.isPending}
                    onClick={() => approveGuardianLink.mutate(link.id)}
                  >
                    Aprobar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-border pt-3">
          <StudentSearchCombobox
            label="Agregar estudiante"
            selected={selected}
            onSelect={setSelected}
            onClear={() => setSelected(null)}
            excludeIds={linkedStudentIds}
          />
          <div className="flex justify-end">
            <Button type="button" disabled={!selected || linkGuardian.isPending} onClick={handleSubmit}>
              {linkGuardian.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </div>
        </div>
        {linkGuardian.isError && (
          <p className="text-sm text-destructive">No se pudo vincular (¿ese vínculo ya existe?).</p>
        )}
      </div>
    </Dialog>
  );
}
