'use client';

import { FormEvent, useState } from 'react';
import { useEnrollStudent } from '../use-enrollments';
import { useCreateUser, useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useLinkAdmissionEnrollment } from '@/features/admissions/use-admissions';
import type { IdentityDocumentType } from '@eduapp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';

type StudentMode = 'existing' | 'new';

interface AdmissionPrefill {
  firstName: string;
  lastName: string;
  birthDate: string;
  documentType: IdentityDocumentType | '';
  documentNumber: string;
  address: string;
  academicYearId: string;
}

const DOCUMENT_TYPE_OPTIONS: { value: IdentityDocumentType; label: string }[] = [
  { value: 'RC', label: 'Registro Civil' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

const today = new Date().toISOString().slice(0, 10);

/**
 * Los datos de la solicitud de admisión (nombre, documento, dirección — PII
 * de un menor) nunca viajan por la URL: `admission-applications-list.tsx`
 * los deja en `sessionStorage` antes de navegar acá. Se leen una sola vez,
 * sincrónicamente (antes de los `useState` que los usan como valor
 * inicial), y se borran de inmediato — no deben quedar en storage después
 * de usarse. `typeof window === 'undefined'` cubre el paso de render en
 * servidor que Next.js hace incluso para client components.
 */
function readAdmissionPrefill(admissionId?: string): AdmissionPrefill | undefined {
  if (!admissionId || typeof window === 'undefined') return undefined;
  const key = `admission-prefill-${admissionId}`;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as AdmissionPrefill;
  } catch {
    return undefined;
  }
}

export function EnrollStudentForm({
  admissionId,
  matchedUserId,
}: {
  admissionId?: string;
  matchedUserId?: string;
}) {
  const { data: students } = useUsers('estudiante');
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const enrollStudent = useEnrollStudent();
  const createUser = useCreateUser();
  const linkEnrollment = useLinkAdmissionEnrollment();

  const prefill = readAdmissionPrefill(admissionId);

  const [mode, setMode] = useState<StudentMode>(matchedUserId ? 'existing' : prefill ? 'new' : 'existing');
  const [dialogOpen, setDialogOpen] = useState(!matchedUserId && !!prefill);
  const [studentId, setStudentId] = useState(matchedUserId ?? '');
  const [firstName, setFirstName] = useState(prefill?.firstName ?? '');
  const [lastName, setLastName] = useState(prefill?.lastName ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState(prefill?.birthDate ?? '');
  const [documentType, setDocumentType] = useState<IdentityDocumentType | ''>(prefill?.documentType ?? '');
  const [documentNumber, setDocumentNumber] = useState(prefill?.documentNumber ?? '');
  const [address, setAddress] = useState(prefill?.address ?? '');
  const [academicYearId, setAcademicYearId] = useState(prefill?.academicYearId ?? '');
  const [sectionId, setSectionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const missingPrereqs = !years?.length || !sections?.length;
  const isPending = enrollStudent.isPending || createUser.isPending;

  function resetNewStudentFields() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setBirthDate('');
    setDocumentType('');
    setDocumentNumber('');
    setAddress('');
  }

  async function handleSubmitExisting(event: FormEvent) {
    event.preventDefault();
    if (!studentId || !academicYearId || !sectionId) return;
    setError(null);
    try {
      const enrollment = await enrollStudent.mutateAsync({ studentId, sectionId, academicYearId });
      if (admissionId) {
        await linkEnrollment.mutateAsync({ id: admissionId, enrollmentId: enrollment.id });
      }
      setStudentId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo matricular al estudiante');
    }
  }

  async function handleSubmitNew(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId || !documentType) return;
    setError(null);

    try {
      const created = await createUser.mutateAsync({
        email,
        password,
        firstName,
        lastName,
        roles: ['estudiante'],
        birthDate,
        documentType,
        documentNumber,
        address,
      });

      const enrollment = await enrollStudent.mutateAsync({ studentId: created.id, sectionId, academicYearId });
      if (admissionId) {
        await linkEnrollment.mutateAsync({ id: admissionId, enrollmentId: enrollment.id });
      }
      resetNewStudentFields();
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo matricular al estudiante');
    }
  }

  return (
    <div className="space-y-3">
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
          <input
            type="radio"
            checked={mode === 'new'}
            onChange={() => {
              setMode('new');
              setDialogOpen(true);
            }}
          />
          Estudiante nuevo
        </label>
      </div>

      {mode === 'existing' ? (
        <form onSubmit={handleSubmitExisting} className="flex flex-wrap items-end gap-3">
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
        </form>
      ) : (
        <Button type="button" onClick={() => setDialogOpen(true)} disabled={missingPrereqs}>
          Matricular estudiante nuevo
        </Button>
      )}

      {missingPrereqs && (
        <p className="text-sm text-muted-foreground">
          Necesitás al menos un año lectivo y una sección creados.
        </p>
      )}
      {mode === 'existing' && error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Matricular estudiante nuevo"
      >
        <form onSubmit={handleSubmitNew} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-firstName">Nombre</Label>
              <Input
                id="new-firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-lastName">Apellido</Label>
              <Input
                id="new-lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-birthDate">Fecha de nacimiento</Label>
              <Input
                id="new-birthDate"
                type="date"
                required
                max={today}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-documentType">Tipo de documento</Label>
              <select
                id="new-documentType"
                required
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as IdentityDocumentType)}
                className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="" disabled>
                  Seleccioná un tipo
                </option>
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-documentNumber">Número de documento</Label>
              <Input
                id="new-documentNumber"
                required
                minLength={3}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-address">Dirección</Label>
              <Input
                id="new-address"
                required
                minLength={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-academicYearId">Año lectivo</Label>
              <select
                id="new-academicYearId"
                required
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
              <Label htmlFor="new-sectionId">Sección</Label>
              <select
                id="new-sectionId"
                required
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Matriculando...' : 'Matricular'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
