'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useGradeWeightConfig, useEditGradeWeightConfig } from '@/features/grading/use-grade-weight-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';

/**
 * `GradeWeightConfig` es una sola configuración compartida por todo el
 * colegio (no una por año lectivo) — este botón vive dentro del
 * expandible de cada año solo porque ahí es donde se pidió que aparezca,
 * pero editarla desde cualquier año actualiza la misma config global.
 */
export function EditGradeWeightConfigButton() {
  const { data: config } = useGradeWeightConfig();
  const editConfig = useEditGradeWeightConfig();
  const [open, setOpen] = useState(false);

  const [actividad, setActividad] = useState('');
  const [evaluacionBimestral, setEvaluacionBimestral] = useState('');
  const [disciplina, setDisciplina] = useState('');

  useEffect(() => {
    if (!config) return;
    setActividad(String(Math.round(config.actividadWeight * 100)));
    setEvaluacionBimestral(String(Math.round(config.evaluacionBimestralWeight * 100)));
    setDisciplina(String(Math.round(config.disciplinaWeight * 100)));
  }, [config]);

  const totalPercent =
    (Number(actividad) || 0) + (Number(evaluacionBimestral) || 0) + (Number(disciplina) || 0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (totalPercent !== 100) return;
    editConfig.mutate(
      {
        actividadWeight: Number(actividad) / 100,
        evaluacionBimestralWeight: Number(evaluacionBimestral) / 100,
        disciplinaWeight: Number(disciplina) / 100,
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  if (!config) return null;

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted-foreground underline hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        Configurar pesos
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Configurar pesos de calificación">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="actividadWeight">Actividad (%)</Label>
              <Input
                id="actividadWeight"
                type="number"
                min={0}
                max={100}
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evaluacionBimestralWeight">Evaluación bimestral (%)</Label>
              <Input
                id="evaluacionBimestralWeight"
                type="number"
                min={0}
                max={100}
                value={evaluacionBimestral}
                onChange={(e) => setEvaluacionBimestral(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disciplinaWeight">Disciplina (%)</Label>
              <Input
                id="disciplinaWeight"
                type="number"
                min={0}
                max={100}
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          <p className={`text-xs ${totalPercent !== 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
            Suma: {totalPercent}%{totalPercent !== 100 && ' — debe sumar 100%'}
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={editConfig.isPending || totalPercent !== 100}>
              {editConfig.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
          {editConfig.isError && <p className="text-sm text-destructive">{editConfig.error.message}</p>}
        </form>
      </Dialog>
    </>
  );
}
