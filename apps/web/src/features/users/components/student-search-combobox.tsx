'use client';

import { useEffect, useRef, useState } from 'react';
import type { GuardianLinkCandidate } from '@eduapp/shared-types';
import { useGuardianLinkCandidates } from '../use-guardians';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const SEARCH_DEBOUNCE_MS = 350;

function candidateSubtitle(candidate: GuardianLinkCandidate): string {
  const parts: string[] = [];
  if (candidate.gradeName) {
    parts.push(candidate.sectionName ? `${candidate.gradeName} — Sección ${candidate.sectionName}` : candidate.gradeName);
  }
  if (candidate.documentNumber) parts.push(`Doc. ${candidate.documentNumber}`);
  if (candidate.birthDate) {
    parts.push(`Nace ${new Date(candidate.birthDate).toLocaleDateString('es-CO')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Sin matrícula ni datos adicionales';
}

/**
 * Buscador de estudiantes para vincular un acudiente — reemplaza un
 * `<select>` que crecía sin límite y no diferenciaba homónimos. Muestra
 * grado/sección/documento/fecha de nacimiento junto al nombre para eso
 * mismo. `excludeIds` saca de los resultados a quienes ya tienen un vínculo
 * (pendiente o aprobado) con este acudiente.
 */
export function StudentSearchCombobox({
  label = 'Estudiante',
  selected,
  onSelect,
  onClear,
  excludeIds,
}: {
  label?: string;
  selected: GuardianLinkCandidate | null;
  onSelect: (candidate: GuardianLinkCandidate) => void;
  onClear: () => void;
  excludeIds?: Set<string>;
}) {
  const [inputValue, setInputValue] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(inputValue), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { data: candidates, isFetching } = useGuardianLinkCandidates(committedSearch);
  const results = (candidates ?? []).filter((c) => !excludeIds?.has(c.id));

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2 text-sm">
          <div>
            <p className="font-medium">{selected.fullName}</p>
            <p className="text-xs text-muted-foreground">{candidateSubtitle(selected)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <Label htmlFor="student-search">{label}</Label>
      <input
        id="student-search"
        type="text"
        autoComplete="off"
        placeholder="Buscar por nombre o documento..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg">
          {isFetching ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Buscando...</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {inputValue ? 'Sin resultados.' : 'Escribí para buscar un estudiante.'}
            </li>
          ) : (
            results.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(candidate);
                    setIsOpen(false);
                    setInputValue('');
                  }}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted',
                  )}
                >
                  <span className="font-medium">{candidate.fullName}</span>
                  <span className="text-xs text-muted-foreground">{candidateSubtitle(candidate)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
