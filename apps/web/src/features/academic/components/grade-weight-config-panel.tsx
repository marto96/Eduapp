'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useGradeWeightConfig, useEditGradeWeightConfig } from '@/features/grading/use-grade-weight-config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';

export function GradeWeightConfigPanel({ canManage = false }: { canManage?: boolean }) {
  const { data: config, isLoading, error } = useGradeWeightConfig();
  const editConfig = useEditGradeWeightConfig();

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
    editConfig.mutate({
      actividadWeight: Number(actividad) / 100,
      evaluacionBimestralWeight: Number(evaluacionBimestral) / 100,
      disciplinaWeight: Number(disciplina) / 100,
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Pesos de calificación</h2>
      {isLoading && <LoadingState />}
      {error && <p className="text-sm text-destructive">No se pudo cargar la configuración de pesos.</p>}

      {config && !canManage && (
        <Card className="py-3">
          <ul className="space-y-1 text-sm">
            <li>Actividad: {Math.round(config.actividadWeight * 100)}%</li>
            <li>Evaluación bimestral: {Math.round(config.evaluacionBimestralWeight * 100)}%</li>
            <li>Disciplina: {Math.round(config.disciplinaWeight * 100)}%</li>
          </ul>
        </Card>
      )}

      {config && canManage && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Card className="flex flex-wrap items-end gap-3 py-3">
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
            <Button type="submit" disabled={editConfig.isPending || totalPercent !== 100}>
              {editConfig.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </Card>
          <p className={`text-xs ${totalPercent !== 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
            Suma: {totalPercent}%{totalPercent !== 100 && ' — debe sumar 100%'}
          </p>
          {editConfig.isError && <p className="text-sm text-destructive">{editConfig.error.message}</p>}
          {editConfig.isSuccess && <p className="text-sm text-muted-foreground">Configuración guardada.</p>}
        </form>
      )}
    </div>
  );
}
