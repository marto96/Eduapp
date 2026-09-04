'use client';

import { useEffect, useState } from 'react';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useGradebookStudents } from '../use-gradebook';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import type { GradebookStudentRow } from '@eduapp/shared-types';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;

export function GradebookSearch({ onSelect }: { onSelect: (student: GradebookStudentRow) => void }) {
  const { data: years } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const ready = Boolean(academicYearId && committedSearch.trim().length >= MIN_SEARCH_LENGTH);
  const { data, isLoading } = useGradebookStudents(
    { academicYearId, search: committedSearch, page: 1, pageSize: 10 },
    ready,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gradebookYear">Año lectivo</Label>
          <select
            id="gradebookYear"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Selecciona un año
            </option>
            {years?.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          placeholder="Buscar estudiante por nombre o documento..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          disabled={!academicYearId}
          className="w-72"
        />
      </div>

      {!academicYearId && (
        <p className="text-sm text-muted-foreground">Elegí un año lectivo para empezar a buscar.</p>
      )}
      {academicYearId && committedSearch.trim().length < MIN_SEARCH_LENGTH && (
        <p className="text-sm text-muted-foreground">Escribí al menos 2 caracteres para buscar.</p>
      )}
      {ready && isLoading && <LoadingState />}
      {ready && data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay estudiantes que coincidan con la búsqueda.</p>
      )}
      {ready && data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((student) => (
            <Card key={student.enrollmentId} className="py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => onSelect(student)}
              >
                <div>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.documentNumber ?? 'Sin documento'} — Sección {student.sectionName}
                  </p>
                </div>
              </button>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
