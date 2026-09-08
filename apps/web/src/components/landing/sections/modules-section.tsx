'use client';

import {
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  MessageCircle,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Reveal } from '../shared/reveal';

const MODULES: { title: string; icon: LucideIcon; body: string; items: string[] }[] = [
  {
    title: 'Académico',
    icon: GraduationCap,
    body: 'Planillas por docente, escalas configurables y boletines listos al cierre del periodo.',
    items: ['Calificaciones y asistencia', 'Horarios por curso y docente', 'Boletines e informes'],
  },
  {
    title: 'Matrícula',
    icon: ClipboardCheck,
    body: 'Proceso de admisión y renovación con documentos, cupos y validaciones del colegio.',
    items: ['Admisiones y renovación', 'Documentos del estudiante', 'Bloqueo por cartera vencida'],
  },
  {
    title: 'Finanzas',
    icon: Wallet,
    body: 'Cargos, pensiones, descuentos y pagos en línea con estado de cuenta por familia.',
    items: ['Pensiones y otros cargos', 'Pagos en línea (PSE y tarjeta)', 'Cartera y conciliación'],
  },
  {
    title: 'Comunicación',
    icon: MessageCircle,
    body: 'Mensajería en tiempo real entre docentes y acudientes, con historial consultable.',
    items: ['Mensajería docente–acudiente', 'Comunicados por curso', 'Calendario de eventos'],
  },
  {
    title: 'Portal de padres',
    icon: Users,
    body: 'Un solo acceso para ver notas, asistencia, pagos y mensajes de todos sus hijos.',
    items: ['Notas y asistencia al día', 'Pagos y recibos', 'Solicitud de certificados'],
  },
  {
    title: 'RRHH y documentos',
    icon: FolderKanban,
    body: 'Hoja de vida del personal, contratos y el archivo institucional en un repositorio.',
    items: ['Personal y contratos', 'Documentos y biblioteca', 'Permisos y novedades'],
  },
];

export function ModulesSection() {
  return (
    <section id="modulos" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-[88px]">
      <Reveal>
        <div className="mb-10 flex flex-col flex-wrap items-start justify-between gap-10 lg:flex-row lg:items-end">
          <div className="max-w-[560px]">
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#9184d9]">Módulos</div>
            <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">
              Seis módulos, una sola base de datos.
            </h2>
          </div>
          <p className="max-w-[34ch] text-sm leading-relaxed text-[#6c7189]">
            Se activan por etapas. El colegio decide con qué empieza —normalmente matrícula— y el resto entra sobre
            los mismos datos.
          </p>
        </div>
      </Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <Reveal key={m.title} delay={(i % 3) * 90}>
            <div className="group rounded-xl border border-[#e2e5f0] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#bfb6ea] hover:shadow-[0_20px_36px_-20px_rgba(31,34,48,0.3)]">
              <div className="mb-4 grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#f2f0fc] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#9184d9]">
                <m.icon
                  className="h-[18px] w-[18px] text-[#7f70d0] transition-colors duration-300 group-hover:text-white"
                  strokeWidth={2}
                />
              </div>
              <div className="mb-2 text-[16.5px] font-semibold">{m.title}</div>
              <div className="mb-4 text-sm leading-relaxed text-[#6c7189]">{m.body}</div>
              <div className="flex flex-col gap-1.5">
                {m.items.map((it) => (
                  <div key={it} className="flex items-center gap-2 text-[13px] text-[#4c516a]">
                    <span className="h-1 w-1 flex-none rounded-full bg-[#c3bce8]" />
                    {it}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
