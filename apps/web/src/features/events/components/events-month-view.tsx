'use client';

import { useMemo, useState } from 'react';
import { useEvents } from '../use-events';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Event } from '@eduapp/shared-types';
import { LoadingState } from '@/components/ui/loading-state';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_VISIBLE_PER_DAY = 3;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isToday(date: Date): boolean {
  return dateKey(date) === dateKey(new Date());
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Grilla rectangular: arranca en el lunes de la semana que contiene el día 1
 * y termina en el domingo de la semana que contiene el último día del mes —
 * así ninguna fila queda cortada a mitad de semana.
 */
function buildMonthGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const endOffset = 6 - ((last.getDay() + 6) % 7);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  const totalDays = startOffset + last.getDate() + endOffset;
  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function EventsMonthView() {
  const { data: events, isLoading, error } = useEvents();
  const { data: sections } = useSections();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events ?? []) {
      const key = dateKey(new Date(event.startsAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [events]);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los eventos.</p>;

  const days = buildMonthGrid(monthDate);
  const monthLabel = monthDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const selectedEvents = selectedKey ? (eventsByDay.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            ‹ Anterior
          </Button>
          <h2 className="min-w-40 text-center text-sm font-medium capitalize">{monthLabel}</h2>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            Siguiente ›
          </Button>
        </div>
        <Button variant="ghost" type="button" onClick={() => setMonthDate(startOfMonth(new Date()))}>
          Hoy
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px rounded border border-border bg-border text-sm">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-surface p-2 text-center text-xs text-muted-foreground">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDay.get(key) ?? [];
            const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
            const hiddenCount = dayEvents.length - visible.length;
            return (
              <button
                key={key}
                type="button"
                disabled={dayEvents.length === 0}
                onClick={() => setSelectedKey(key)}
                className={cn(
                  'min-h-24 bg-surface p-1.5 text-left align-top transition-colors disabled:cursor-default',
                  !isSameMonth(day, monthDate) && 'opacity-40',
                  key === selectedKey && 'ring-2 ring-inset ring-primary',
                  dayEvents.length > 0 && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                <span className={cn('text-xs', isToday(day) && 'font-semibold text-primary')}>
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {visible.map((event) => (
                    <p
                      key={event.id}
                      title={event.title}
                      className={cn(
                        'truncate rounded bg-primary/10 px-1 py-0.5 text-[11px] text-primary',
                        event.voidedAt && 'bg-destructive/10 text-destructive line-through',
                      )}
                    >
                      {event.title}
                    </p>
                  ))}
                  {hiddenCount > 0 && <p className="text-[11px] text-muted-foreground">+{hiddenCount} más</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedKey && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium capitalize">
              {new Date(`${selectedKey}T00:00:00`).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => setSelectedKey(null)}
            >
              Cerrar
            </button>
          </div>
          <ul className="space-y-2">
            {selectedEvents.map((event) => (
              <li key={event.id} className="border-t border-border pt-2 first:border-0 first:pt-0">
                <p className="font-medium">
                  {event.title}
                  {event.sectionId && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({sectionNameById.get(event.sectionId) ?? 'sección'})
                    </span>
                  )}
                  {event.voidedAt && <span className="ml-2 text-xs uppercase text-destructive">Anulado</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTime(event.startsAt)}
                  {event.endsAt && ` – ${formatTime(event.endsAt)}`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
