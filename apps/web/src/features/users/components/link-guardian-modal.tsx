'use client';

import { FormEvent, useState } from 'react';
import { useGuardians, useLinkGuardian, useApproveGuardianLink } from '../use-guardians';
import { useUsers } from '../use-users';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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

  const [studentUserId, setStudentUserId] = useState('');

  const studentNameById = new Map(students?.map((u) => [u.id, u.fullName]));
  const guardianLinks = links?.filter((l) => l.guardianUserId === guardianUserId) ?? [];
  const linkedStudentIds = new Set(guardianLinks.map((l) => l.studentUserId));
  const availableStudents = students?.filter((s) => !linkedStudentIds.has(s.id)) ?? [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!guardianUserId || !studentUserId) return;
    linkGuardian.mutate({ guardianUserId, studentUserId }, { onSuccess: () => setStudentUserId('') });
  }

  function handleClose() {
    setStudentUserId('');
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

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="studentUserId">Agregar estudiante</Label>
            <select
              id="studentUserId"
              required
              value={studentUserId}
              onChange={(e) => setStudentUserId(e.target.value)}
              className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="" disabled>
                Selecciona uno
              </option>
              {availableStudents.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={linkGuardian.isPending || availableStudents.length === 0}>
            {linkGuardian.isPending ? 'Vinculando...' : 'Vincular'}
          </Button>
        </form>
        {linkGuardian.isError && (
          <p className="text-sm text-destructive">No se pudo vincular (¿ese vínculo ya existe?).</p>
        )}
        {availableStudents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ya está vinculado a todos los estudiantes disponibles.
          </p>
        )}
      </div>
    </Dialog>
  );
}
