'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useMyProfile, useEditMyProfile, useUploadMyProfilePhoto } from '../use-profile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

const DOCUMENT_TYPES = [
  { value: '', label: 'Sin especificar' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

export function ProfileForm() {
  const { data: profile, isLoading } = useMyProfile();
  const editProfile = useEditMyProfile();
  const uploadPhoto = useUploadMyProfilePhoto();
  const [file, setFile] = useState<File | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setBirthDate(profile.birthDate ?? '');
    setDocumentType(profile.documentType ?? '');
    setDocumentNumber(profile.documentNumber ?? '');
    setAddress(profile.address ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function handleUploadPhoto() {
    if (!file) return;
    uploadPhoto.mutate(file, { onSuccess: () => setFile(null) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    editProfile.mutate({
      firstName,
      lastName,
      birthDate: birthDate || undefined,
      documentType: documentType || undefined,
      documentNumber: documentNumber || undefined,
      address: address || undefined,
      phone: phone || undefined,
    });
  }

  if (isLoading) return <LoadingState />;
  if (!profile) return <p className="text-sm text-destructive">No se pudo cargar tu perfil.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[10px] uppercase tracking-wide text-primary">Foto de perfil</p>
        <div className="mt-2 flex items-center gap-4">
          {profile.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt={profile.fullName}
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          )}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="text-sm"
            />
            <div>
              <Button type="button" disabled={!file || uploadPhoto.isPending} onClick={handleUploadPhoto}>
                {uploadPhoto.isPending ? 'Subiendo...' : 'Subir foto'}
              </Button>
            </div>
            {uploadPhoto.isError && <p className="text-sm text-destructive">No se pudo subir la foto.</p>}
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-[10px] uppercase tracking-wide text-primary">Datos básicos</p>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Nombre</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Apellido</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Fecha de nacimiento</span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Teléfono</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Tipo de documento</span>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              >
                {DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Número de documento</span>
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="col-span-2 space-y-1 text-sm">
              <span className="text-muted-foreground">Dirección</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5"
              />
            </label>
          </div>
          <Button type="submit" disabled={editProfile.isPending}>
            {editProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {editProfile.isError && (
            <p className="text-sm text-destructive">{(editProfile.error as Error).message}</p>
          )}
          {editProfile.isSuccess && <p className="text-sm text-primary">Perfil actualizado.</p>}
        </form>
      </Card>
    </div>
  );
}
