'use client';

import { FormEvent, useState } from 'react';
import { useMyGuardianLinks, useRequestGuardianLink } from '@/features/users/use-guardians';
import { useUsers } from '@/features/users/use-users';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function RequestGuardianLinkForm() {
  const { data: students } = useUsers('estudiante');
  const { data: myLinks } = useMyGuardianLinks();
  const requestLink = useRequestGuardianLink();
  const [studentUserId, setStudentUserId] = useState('');

  const studentNameById = new Map(students?.map((u) => [u.id, u.fullName]));
  const pendingLinks = (myLinks ?? []).filter((l) => l.status === 'pending');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!studentUserId) return;
    requestLink.mutate({ studentUserId }, { onSuccess: () => setStudentUserId('') });
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-medium">Vincular con mi hijo/a</h2>
        <p className="text-sm text-muted-foreground">
          La solicitud queda pendiente hasta que la institución la apruebe.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="studentUserId">Estudiante</Label>
          <select
            id="studentUserId"
            required
            value={studentUserId}
            onChange={(e) => setStudentUserId(e.target.value)}
            className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Selecciona uno
            </option>
            {students?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={requestLink.isPending}>
          {requestLink.isPending ? 'Enviando...' : 'Solicitar vínculo'}
        </Button>
        {requestLink.isError && (
          <p className="w-full text-sm text-destructive">
            No se pudo enviar la solicitud (¿ya existe ese vínculo?).
          </p>
        )}
      </form>
      {pendingLinks.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
          {pendingLinks.map((link) => (
            <li key={link.id}>
              {studentNameById.get(link.studentUserId) ?? link.studentUserId} — pendiente de aprobación
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
