'use client';

import { useState } from 'react';
import { useEmailTemplates, useUpdateEmailTemplate } from './use-email-templates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { TemplateBodyEditor } from './template-body-editor';
import type { EmailTemplateType } from '@eduapp/shared-types';

const LABELS: Record<EmailTemplateType, string> = {
  solicitud_recibida: 'Solicitud de admisión recibida',
  pago_aprobado: 'Pago de admisión aprobado',
  pago_rechazado: 'Pago de admisión rechazado',
  solicitud_aceptada: 'Solicitud de admisión aceptada',
  solicitud_rechazada: 'Solicitud de admisión rechazada',
  recordatorio_pension: 'Recordatorio de pensión vencida',
};

const PLACEHOLDERS: Record<EmailTemplateType, string[]> = {
  solicitud_recibida: ['{{guardianName}}', '{{estudiante}}', '{{grado}}', '{{trackingCode}}', '{{checkoutUrl}}'],
  pago_aprobado: ['{{trackingCode}}'],
  pago_rechazado: ['{{trackingCode}}'],
  solicitud_aceptada: ['{{trackingCode}}', '{{estudiante}}'],
  solicitud_rechazada: ['{{trackingCode}}', '{{estudiante}}'],
  recordatorio_pension: ['{{estudiante}}', '{{fechaVencimiento}}', '{{monto}}'],
};

export function EmailTemplatesView() {
  const { data: templates, isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const [editing, setEditing] = useState<{ type: EmailTemplateType; subject: string; body: string } | null>(null);

  if (isLoading) return <LoadingState label="Cargando plantillas..." />;

  return (
    <div className="space-y-4">
      {templates?.map((template) => (
        <Card key={template.type}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{LABELS[template.type]}</h3>
            {!template.isCustom && (
              <span className="text-xs text-muted-foreground">Usando texto por defecto</span>
            )}
          </div>
          {editing?.type === template.type ? (
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${template.type}-subject`}>Asunto</Label>
                <Input
                  id={`${template.type}-subject`}
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Cuerpo</Label>
                <TemplateBodyEditor
                  value={editing.body}
                  onChange={(html) => setEditing({ ...editing, body: html })}
                  placeholders={PLACEHOLDERS[template.type]}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={updateTemplate.isPending}
                  onClick={() => {
                    updateTemplate.mutate(
                      { type: editing.type, subject: editing.subject, body: editing.body },
                      { onSuccess: () => setEditing(null) },
                    );
                  }}
                >
                  Guardar
                </Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{template.subject}</p>
              <Button
                variant="ghost"
                className="mt-2 h-auto px-0"
                onClick={() => setEditing({ type: template.type, subject: template.subject, body: template.body })}
              >
                Editar
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
