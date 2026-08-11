'use client';

import { FormEvent, useState } from 'react';
import { useGuardians, useLinkGuardian } from '../use-guardians';
import { useUsers } from '../use-users';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function LinkGuardianForm() {
  const { data: guardianUsers } = useUsers('padre_tutor');
  const { data: students } = useUsers('estudiante');
  const { data: links } = useGuardians();
  const linkGuardian = useLinkGuardian();

  const [guardianUserId, setGuardianUserId] = useState('');
  const [studentUserId, setStudentUserId] = useState('');

  const guardianNameById = new Map(guardianUsers?.map((u) => [u.id, u.fullName]));
  const studentNameById = new Map(students?.map((u) => [u.id, u.fullName]));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!guardianUserId || !studentUserId) return;
    linkGuardian.mutate(
      { guardianUserId, studentUserId },
      { onSuccess: () => setStudentUserId('') },
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-medium">Vincular padre/tutor a estudiante</h2>
        <p className="text-sm text-muted-foreground">
          Un padre/tutor vinculado solo ve la asistencia y las notas de sus hijos, no las de todo
          el resto de la institución.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="guardianUserId">Padre/tutor</Label>
          <select
            id="guardianUserId"
            required
            value={guardianUserId}
            onChange={(e) => setGuardianUserId(e.target.value)}
            className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná uno
            </option>
            {guardianUsers?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentUserId">Estudiante</Label>
          <select
            id="studentUserId"
            required
            value={studentUserId}
            onChange={(e) => setStudentUserId(e.target.value)}
            className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná uno
            </option>
            {students?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={linkGuardian.isPending}>
          {linkGuardian.isPending ? 'Vinculando...' : 'Vincular'}
        </Button>
        {linkGuardian.isError && (
          <p className="w-full text-sm text-destructive">
            No se pudo vincular (¿ese vínculo ya existe?).
          </p>
        )}
      </form>
      {links && links.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
          {links.map((link) => (
            <li key={link.id}>
              {guardianNameById.get(link.guardianUserId) ?? link.guardianUserId} →{' '}
              {studentNameById.get(link.studentUserId) ?? link.studentUserId}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
