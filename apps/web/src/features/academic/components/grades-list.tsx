'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useGrades, useEditGrade, useDeleteGrade } from '../use-grades';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Grade } from '@eduapp/shared-types';
import { LoadingState } from '@/components/ui/loading-state';

export function GradesList({ canManage = false }: { canManage?: boolean }) {
  const { data: grades, isLoading, error } = useGrades();
  const editGrade = useEditGrade();
  const deleteGrade = useDeleteGrade();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [order, setOrder] = useState('');
  const [deletingGrade, setDeletingGrade] = useState<Grade | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los grados.</p>;
  if (!grades || grades.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay grados.</p>;
  }

  function startEditing(grade: Grade) {
    setEditingId(grade.id);
    setName(grade.name);
    setLevel(grade.level);
    setOrder(String(grade.order));
  }

  function saveEdit(id: string) {
    if (!name.trim() || !level.trim() || order.trim() === '') return;
    editGrade.mutate(
      { id, name, level, order: Number(order) },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function confirmDelete() {
    if (!deletingGrade) return;
    deleteGrade.mutate(deletingGrade.id, {
      onSuccess: () => setDeletingGrade(null),
    });
  }

  return (
    <>
    <ul className="space-y-2">
      {grades.map((grade) => {
        const isEditing = editingId === grade.id;
        return (
          <Card key={grade.id} className="py-3">
            {isEditing ? (
              <div className="flex flex-wrap items-end gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[12rem]" />
                <Input value={level} onChange={(e) => setLevel(e.target.value)} className="max-w-[12rem]" />
                <Input
                  type="number"
                  min={0}
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-20"
                />
                <Button type="button" disabled={editGrade.isPending} onClick={() => saveEdit(grade.id)}>
                  Guardar
                </Button>
                <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
                {editGrade.isError && (
                  <p className="w-full text-sm text-destructive">{editGrade.error.message}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium">{grade.name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Orden: {grade.order}</span>
                  <span className="text-xs uppercase text-muted-foreground">{grade.level}</span>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        title="Editar grado"
                        aria-label="Editar grado"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => startEditing(grade)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar grado"
                        aria-label="Eliminar grado"
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          deleteGrade.reset();
                          setDeletingGrade(grade);
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
      open={deletingGrade !== null}
      onClose={() => {
        setDeletingGrade(null);
        deleteGrade.reset();
      }}
      onConfirm={confirmDelete}
      title="Eliminar grado"
      description={`¿Eliminar el grado ${deletingGrade?.name}? Esta acción no se puede deshacer.`}
      isConfirming={deleteGrade.isPending}
      errorMessage={deleteGrade.isError ? deleteGrade.error.message : undefined}
    />
    </>
  );
}
