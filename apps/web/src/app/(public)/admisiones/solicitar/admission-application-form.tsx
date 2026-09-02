'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useCreateAdmissionApplication } from '@/features/admissions/use-admissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { Grade, IdentityDocumentType } from '@eduapp/shared-types';

const DOCUMENT_TYPE_OPTIONS: { value: IdentityDocumentType; label: string }[] = [
  { value: 'RC', label: 'Registro Civil' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

const today = new Date().toISOString().slice(0, 10);

export function AdmissionApplicationForm() {
  const createApplication = useCreateAdmissionApplication();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentDocumentType, setStudentDocumentType] = useState<IdentityDocumentType | ''>('');
  const [studentDocumentNumber, setStudentDocumentNumber] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  useEffect(() => {
    fetch('/api/public/grades')
      .then((res) => res.json())
      .then(setGrades)
      .catch(() => setGrades([]));
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!studentDocumentType || !gradeId) return;
    createApplication.mutate(
      {
        studentFirstName,
        studentLastName,
        studentBirthDate,
        studentDocumentType,
        studentDocumentNumber,
        studentAddress,
        gradeId,
        guardianName,
        guardianEmail,
        guardianPhone,
      },
      {
        onSuccess: ({ checkoutUrl }) => {
          window.location.href = checkoutUrl;
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium">Datos del aspirante</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="studentFirstName">Nombre</Label>
          <Input
            id="studentFirstName"
            required
            value={studentFirstName}
            onChange={(e) => setStudentFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentLastName">Apellido</Label>
          <Input
            id="studentLastName"
            required
            value={studentLastName}
            onChange={(e) => setStudentLastName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentBirthDate">Fecha de nacimiento</Label>
          <Input
            id="studentBirthDate"
            type="date"
            required
            max={today}
            value={studentBirthDate}
            onChange={(e) => setStudentBirthDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gradeId">Grado al que aspira</Label>
          <select
            id="gradeId"
            required
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Seleccioná un grado
            </option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="studentDocumentType">Tipo de documento</Label>
          <select
            id="studentDocumentType"
            required
            value={studentDocumentType}
            onChange={(e) => setStudentDocumentType(e.target.value as IdentityDocumentType)}
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
          <Label htmlFor="studentDocumentNumber">Número de documento</Label>
          <Input
            id="studentDocumentNumber"
            required
            minLength={3}
            value={studentDocumentNumber}
            onChange={(e) => setStudentDocumentNumber(e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="studentAddress">Dirección</Label>
          <Input
            id="studentAddress"
            required
            minLength={3}
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
          />
        </div>
      </div>

      <p className="text-sm font-medium">Datos de contacto (acudiente)</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="guardianName">Nombre completo</Label>
          <Input
            id="guardianName"
            required
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guardianEmail">Email</Label>
          <Input
            id="guardianEmail"
            type="email"
            required
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guardianPhone">Teléfono</Label>
          <Input
            id="guardianPhone"
            required
            minLength={7}
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
          />
        </div>
      </div>

      {createApplication.isError && (
        <p className="text-sm text-destructive">{createApplication.error.message}</p>
      )}

      <Button type="submit" disabled={createApplication.isPending} className="w-full">
        {createApplication.isPending && <Spinner className="mr-2 h-4 w-4" />}
        {createApplication.isPending ? 'Enviando...' : 'Enviar solicitud y pagar'}
      </Button>
    </form>
  );
}
