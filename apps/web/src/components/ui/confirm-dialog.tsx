'use client';

import { Dialog } from './dialog';
import { Button } from './button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Eliminar',
  isConfirming = false,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  errorMessage?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="border-destructive text-destructive hover:bg-destructive/10"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? 'Eliminando...' : confirmLabel}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      </div>
    </Dialog>
  );
}
