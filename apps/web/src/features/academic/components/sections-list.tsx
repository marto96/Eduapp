'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useSections, useEditSection, useDeleteSection } from '../use-sections';
import { useGrades } from '../use-grades';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Section } from '@eduapp/shared-types';

export function SectionsList({ canManage = false }: { canManage?: boolean }) {
  const { data: sections, isLoading, error } = useSections();
  const { data: grades } = useGrades();
  const editSection = useEditSection();
  const deleteSection = useDeleteSection();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las secciones.</p>;
  if (!sections || sections.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay secciones.</p>;
  }

  const gradeNameById = new Map(grades?.map((grade) => [grade.id, grade.name]));

  function startEditing(section: Section) {
    setEditingId(section.id);
    setName(section.name);
  }

  function saveEdit(id: string) {
    if (!name.trim()) return;
    editSection.mutate({ id, name }, { onSuccess: () => setEditingId(null) });
  }

  function confirmDelete() {
    if (!deletingSection) return;
    deleteSection.mutate(deletingSection.id, {
      onSuccess: () => setDeletingSection(null),
    });
  }

  return (
    <>
      <ul className="space-y-2">
        {sections.map((section) => {
          const isEditing = editingId === section.id;
          return (
            <Card key={section.id} className="py-3">
              {isEditing ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[12rem]" />
                  <Button type="button" disabled={editSection.isPending} onClick={() => saveEdit(section.id)}>
                    Guardar
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                  {editSection.isError && (
                    <p className="w-full text-sm text-destructive">{editSection.error.message}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-medium">{section.name}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {gradeNameById.get(section.gradeId) ?? section.gradeId}
                    </span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          title="Editar sección"
                          aria-label="Editar sección"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => startEditing(section)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar sección"
                          aria-label="Eliminar sección"
                          className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            deleteSection.reset();
                            setDeletingSection(section);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </ul>
      <ConfirmDialog
        open={deletingSection !== null}
        onClose={() => {
          setDeletingSection(null);
          deleteSection.reset();
        }}
        onConfirm={confirmDelete}
        title="Eliminar sección"
        description={`¿Eliminar la sección ${deletingSection?.name}? Esta acción no se puede deshacer.`}
        isConfirming={deleteSection.isPending}
        errorMessage={deleteSection.isError ? deleteSection.error.message : undefined}
      />
    </>
  );
}
