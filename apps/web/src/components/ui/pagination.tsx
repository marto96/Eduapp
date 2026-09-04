import { Button } from './button';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Si se pasa junto con `onPageSizeChange`, muestra un selector de tamaño de página (pastillas). */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPageSizeControl = !!(pageSizeOptions && onPageSizeChange);
  if (totalPages <= 1 && !showPageSizeControl) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages} · {total} resultado{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        {showPageSizeControl && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange(size)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  pageSize === size
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        )}
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
