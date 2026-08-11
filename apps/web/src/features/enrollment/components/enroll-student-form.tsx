'use client';

import { FormEvent, useState } from 'react';
import { useEnrollStudent } from '../use-enrollments';
import { useCreateUser, useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type StudentMode = 'existing' | 'new';

export function EnrollStudentForm() {
  const { data: students } = useUsers('estudiante');
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const enrollStudent = useEnrollStudent();
  const createUser = useCreateUser();

  const [mode, setMode] = useState<StudentMode>('existing');
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [error, setError] = useState(false);

  const missingPrereqs = !years?.length || !sections?.length;
  const isPending = enrollStudent.isPending || createUser.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId) return;
    setError(false);

    try {
      const id =
        mode === 'existing'
          ? studentId
          : (
              await createUser.mutateAsync({
                email,
                password,
                firstName,
                lastName,
                roles: ['estudiante'],
              })
            ).id;

      if (!id) return;

      await enrollStudent.mutateAsync({ studentId: id, sectionId, academicYearId });
      setStudentId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
    } catch {
      setError(true);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === 'existing'}
            onChange={() => setMode('existing')}
          />
          Estudiante existente
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
          Estudiante nuevo
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {mode === 'existing' ? (
          <div className="space-y-1.5">
            <Label htmlFor="studentId">Estudiante</Label>
            <select
              id="studentId"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="" disabled>
                Seleccioná un estudiante
              </option>
              {students?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="academicYearId">Año lectivo</Label>
          <select
            id="academicYearId"
            required
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná un año
            </option>
            {years?.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sectionId">Sección</Label>
          <select
            id="sectionId"
            required
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná una sección
            </option>
            {sections?.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={isPending || missingPrereqs}>
          {isPending ? 'Matriculando...' : 'Matricular'}
        </Button>
      </div>

      {missingPrereqs && (
        <p className="text-sm text-muted-foreground">
          Necesitás al menos un año lectivo y una sección creados.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          No se pudo matricular (¿el estudiante ya tiene una matrícula activa en ese año, o el
          email ya existe?).
        </p>
      )}
    </form>
  );
}
