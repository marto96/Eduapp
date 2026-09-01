'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderKanban,
  GraduationCap,
  History,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Matrícula', active: false },
  { label: 'Académico', active: true },
  { label: 'Finanzas', active: false },
  { label: 'Comunicación', active: false },
  { label: 'Portal de padres', active: false },
  { label: 'RRHH', active: false },
].map((item) => ({
  ...item,
  color: item.active ? '#3b3f52' : '#7c8199',
  bg: item.active ? '#eeecf9' : 'transparent',
  weight: item.active ? 600 : 400,
  dot: item.active ? '#9184d9' : '#c9cddd',
}));

const ROWS = [
  { name: 'Acosta Rivera, Ana', nota: '4,3', asis: '98%', pay: 'Al día', payColor: '#4b7a58' },
  { name: 'Bermúdez Cruz, Juan', nota: '3,8', asis: '94%', pay: 'Al día', payColor: '#4b7a58' },
  { name: 'Cárdenas Lara, Sofía', nota: '4,6', asis: '100%', pay: 'Al día', payColor: '#4b7a58' },
  { name: 'Duarte Peña, Miguel', nota: '3,5', asis: '89%', pay: 'Vencida', payColor: '#b4553f' },
  { name: 'Espinosa Gil, Valeria', nota: '4,2', asis: '97%', pay: 'Al día', payColor: '#4b7a58' },
];

const PAINS = [
  {
    painTitle: 'Cada área con su propio Excel',
    painBody: 'Secretaría, coordinación y tesorería llevan listas distintas del mismo estudiante, y nunca cuadran.',
    fixTitle: 'Una sola ficha por estudiante',
    fixBody: 'Se digita en matrícula y el resto de las áreas lee esos mismos datos.',
  },
  {
    painTitle: 'Pensiones cobradas a mano, mes a mes',
    painBody: 'Alguien arma recibos, revisa consignaciones y llama a las familias en mora. Cada mes, desde cero.',
    fixTitle: 'Cargos automáticos y pago en línea',
    fixBody: 'Se generan solas, la familia paga desde el portal y la conciliación queda registrada.',
  },
  {
    painTitle: 'La comunicación vive en WhatsApp',
    painBody: 'Circulares que se pierden, docentes contestando desde su número personal y ningún registro.',
    fixTitle: 'Mensajería dentro del sistema',
    fixBody: 'Conversaciones con historial, comunicados por curso y calendario institucional en un solo lugar.',
  },
  {
    painTitle: 'Boletines armados a mano cada periodo',
    painBody: 'Copiar notas de cada planilla, revisar promedios y reimprimir cuando algo falla.',
    fixTitle: 'Boletines generados automáticamente',
    fixBody: 'El docente carga notas en su planilla digital y el boletín sale con el formato del colegio.',
  },
];

const MODULES: {
  title: string;
  icon: LucideIcon;
  body: string;
  items: string[];
}[] = [
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

const FLOW: {
  step: string;
  role: string;
  title: string;
  icon: LucideIcon;
  body: string;
  data: string;
}[] = [
  {
    step: '01',
    role: 'Secretaría',
    title: 'Matrícula',
    icon: FileText,
    body: 'Se registra al estudiante una sola vez, con sus acudientes y su grado.',
    data: 'estudiante · acudiente · grado 9°B',
  },
  {
    step: '02',
    role: 'Coordinación',
    title: 'Académico',
    icon: BookOpen,
    body: 'Queda en su curso, su horario y la planilla de cada docente.',
    data: 'hereda: curso, docentes, horario',
  },
  {
    step: '03',
    role: 'Tesorería',
    title: 'Finanzas',
    icon: Wallet,
    body: 'Se generan los cargos del plan de pensiones que le corresponde.',
    data: 'hereda: grado → plan de pago',
  },
  {
    step: '04',
    role: 'Familias',
    title: 'Comunicación',
    icon: Users,
    body: 'Los acudientes reciben acceso al portal, comunicados y mensajería de su curso.',
    data: 'hereda: acudiente → portal 9°B',
  },
];

const SECURITY: { title: string; icon: LucideIcon; body: string }[] = [
  {
    title: 'Permisos por rol y alcance',
    icon: ShieldCheck,
    body: 'Rector, coordinación, docente, tesorería, secretaría y acudiente ven solo lo que les corresponde.',
  },
  {
    title: 'Datos aislados por institución',
    icon: Building2,
    body: 'Cada colegio en su propio subdominio, con su propio espacio de datos. Nada se cruza entre instituciones.',
  },
  {
    title: 'Registro de auditoría',
    icon: History,
    body: 'Quién cambió una nota, quién anuló un cargo y cuándo. Consultable desde rectoría.',
  },
  {
    title: 'Copias de respaldo diarias',
    icon: RefreshCw,
    body: 'Respaldo automático y cifrado en tránsito. Sin servidores ni mantenimiento en el colegio.',
  },
];

const DEMO_POINTS = [
  'Recorrido por matrícula, académico y finanzas con datos de ejemplo.',
  'Cómo migrar sus planillas actuales sin re-digitar el año en curso.',
  'Propuesta de implementación por etapas y costo según número de estudiantes.',
];

function Logo({ size = 26, dot = 9, radius = 7 }: { size?: number; dot?: number; radius?: number }) {
  return (
    <div
      className="grid flex-none place-items-center bg-[#9184d9]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <div className="bg-white" style={{ width: dot, height: dot, borderRadius: Math.max(2, radius - 5) }} />
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    // Salvaguarda: si el observer nunca dispara (pestaña en background al
    // cargar, navegador que difiere el trabajo de rAF), el contenido no debe
    // quedar invisible para siempre.
    const safety = setTimeout(() => setVisible(true), 2000);
    return () => {
      observer.disconnect();
      clearTimeout(safety);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="w-full overflow-x-hidden bg-[#eef0f8] font-sans text-[#1f2230]">
      <header className="sticky top-0 z-20 border-b border-[#dcdfec] bg-[#eef0f8]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Skolaria</span>
          </div>
          <nav className="flex items-center gap-5 sm:gap-7">
            <a href="#modulos" className="hidden text-sm text-[#5d6178] no-underline hover:text-[#1f2230] md:inline">
              Módulos
            </a>
            <a href="#sistema" className="hidden text-sm text-[#5d6178] no-underline hover:text-[#1f2230] md:inline">
              Un solo sistema
            </a>
            <a href="#seguridad" className="hidden text-sm text-[#5d6178] no-underline hover:text-[#1f2230] md:inline">
              Seguridad
            </a>
            <a href="/login" className="hidden text-sm text-[#5d6178] no-underline hover:text-[#1f2230] md:inline">
              Iniciar sesión
            </a>
            <a
              href="#demo"
              className="inline-flex items-center rounded-lg bg-[#1f2230] px-4 py-2.5 text-sm font-medium text-white no-underline hover:bg-[#32364a]"
            >
              Agendar una demo
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-[84px]">
        <Reveal>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d9dcea] bg-white py-1.5 pl-2 pr-3 text-[12.5px] text-[#5d6178]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9184d9]" />
            Plataforma para colegios en Colombia
          </div>
          <h1 className="mb-5 text-balance text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[42px] lg:text-[54px]">
            Toda la gestión de tu colegio, en un solo lugar.
          </h1>
          <p className="mb-8 max-w-[46ch] text-lg leading-relaxed text-[#4c516a]">
            Matrícula, calificaciones, asistencia, pensiones, pagos en línea y comunicación con las familias. Un dato
            se digita una vez y sirve para todo el año escolar.
          </p>
          <div className="mb-7 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="inline-flex items-center rounded-[9px] bg-[#9184d9] px-[22px] py-[13px] text-[15px] font-medium text-white no-underline shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#7f70d0]"
            >
              Agendar una demo
            </a>
            <a
              href="#modulos"
              className="inline-flex items-center rounded-[9px] border border-[#d9dcea] bg-white px-[22px] py-[13px] text-[15px] font-medium text-[#1f2230] no-underline transition-transform hover:-translate-y-0.5 hover:border-[#b9bed4]"
            >
              Ver funcionalidades
            </a>
          </div>
          <p className="text-[13px] leading-relaxed text-[#767b93]">
            Cada colegio con su propio subdominio y su color institucional. Sin instalaciones: se entra desde el
            navegador.
          </p>
        </Reveal>

        <Reveal delay={150}>
        <div className="relative">
          <div className="absolute -inset-x-3 -bottom-[18px] top-[18px] hidden rounded-2xl bg-[#dfe2ef] sm:block" />
          <div className="relative overflow-hidden rounded-2xl border border-[#d9dcea] bg-white shadow-[0_24px_48px_-28px_rgba(31,34,48,0.35)]">
            <div className="flex items-center gap-2 border-b border-[#e6e8f2] bg-[#f7f8fc] px-3.5 py-2.5">
              <span className="h-2 w-2 rounded-full bg-[#d5d8e6]" />
              <span className="h-2 w-2 rounded-full bg-[#d5d8e6]" />
              <span className="h-2 w-2 rounded-full bg-[#d5d8e6]" />
              <span className="ml-2.5 truncate font-mono text-[11px] text-[#868ba3]">
                sanjose.skolaria.co/academico
              </span>
            </div>
            <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[148px_1fr]">
              <div className="border-r border-[#eceef6] bg-[#fafbfe] px-2.5 py-3.5">
                <div className="mb-2.5 px-2 text-[10px] uppercase tracking-[0.09em] text-[#9aa0b8]">Módulos</div>
                <div className="flex flex-col gap-0.5">
                  {NAV_ITEMS.map((nav) => (
                    <div
                      key={nav.label}
                      className="flex items-center gap-2 rounded-md px-2 py-[7px] text-[12.5px]"
                      style={{ color: nav.color, backgroundColor: nav.bg, fontWeight: nav.weight }}
                    >
                      <span
                        className="h-[5px] w-[5px] flex-none rounded-[1px]"
                        style={{ backgroundColor: nav.dot }}
                      />
                      <span className="truncate">{nav.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-3 py-4 sm:px-[18px] sm:py-5">
                <div className="mb-3.5 flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Grado 9°B — Matemáticas</div>
                    <div className="mt-[3px] text-[11.5px] text-[#868ba3]">Periodo 3 · 32 estudiantes</div>
                  </div>
                  <div className="whitespace-nowrap rounded-md bg-[#eeecf9] px-2.5 py-1 text-[11px] text-[#5f52b8]">
                    Boletín listo
                  </div>
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-[#eceef6] px-2.5 py-2.5">
                    <div className="text-[10.5px] text-[#868ba3]">Promedio</div>
                    <div className="mt-0.5 text-[17px] font-semibold">4,1</div>
                  </div>
                  <div className="rounded-lg border border-[#eceef6] px-2.5 py-2.5">
                    <div className="text-[10.5px] text-[#868ba3]">Asistencia</div>
                    <div className="mt-0.5 text-[17px] font-semibold">96%</div>
                  </div>
                  <div className="rounded-lg border border-[#eceef6] px-2.5 py-2.5">
                    <div className="text-[10.5px] text-[#868ba3]">Cartera</div>
                    <div className="mt-0.5 text-[17px] font-semibold text-[#b4553f]">3</div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-[#eceef6]">
                  <div className="grid grid-cols-[1fr_40px_48px_56px] gap-2 bg-[#f7f8fc] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.06em] text-[#9aa0b8] sm:grid-cols-[1fr_52px_60px_58px]">
                    <span>Estudiante</span>
                    <span>Nota</span>
                    <span>Asist.</span>
                    <span>Pensión</span>
                  </div>
                  {ROWS.map((row) => (
                    <div
                      key={row.name}
                      className="grid grid-cols-[1fr_40px_48px_56px] items-center gap-2 border-t border-[#f1f3f9] px-2.5 py-2 text-xs sm:grid-cols-[1fr_52px_60px_58px]"
                    >
                      <span className="truncate text-[#33374a]">{row.name}</span>
                      <span className="tabular-nums">{row.nota}</span>
                      <span className="tabular-nums text-[#6c7189]">{row.asis}</span>
                      <span className="text-[10.5px]" style={{ color: row.payColor }}>
                        {row.pay}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      <section className="border-y border-[#e2e5f0] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-[88px]">
          <div className="mb-12 max-w-[620px]">
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#9184d9]">
              El día a día
            </div>
            <h2 className="mb-3.5 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">
              Lo que hoy toma tres archivos y cuatro llamadas.
            </h2>
            <p className="text-[16.5px] leading-relaxed text-[#4c516a]">
              La mayoría de los colegios no tiene un problema de software: tiene ocho herramientas que no se hablan
              entre ellas.
            </p>
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl border border-[#e6e8f2]">
            {PAINS.map((p, i) => (
              <Reveal key={p.painTitle} delay={i * 60}>
                <div className="grid grid-cols-1 border-t border-[#e6e8f2] sm:grid-cols-[1fr_1.15fr]">
                  <div className="bg-[#fafbfe] px-6 py-6 sm:px-7">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-[#a2a7bd]">
                      <AlertCircle className="h-3 w-3" strokeWidth={2.25} />
                      Hoy
                    </div>
                    <div className="mb-1.5 text-base font-medium">{p.painTitle}</div>
                    <div className="text-sm leading-[1.55] text-[#6c7189]">{p.painBody}</div>
                  </div>
                  <div className="border-t border-[#e6e8f2] px-6 py-6 sm:border-l sm:border-t-0 sm:px-7">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-[#9184d9]">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.25} />
                      Con Skolaria
                    </div>
                    <div className="mb-1.5 text-base font-medium">{p.fixTitle}</div>
                    <div className="text-sm leading-[1.55] text-[#4c516a]">{p.fixBody}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-[88px]">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delay={i * 70}>
              <div className="group rounded-xl border border-[#e2e5f0] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#bfb6ea] hover:shadow-[0_10px_24px_-18px_rgba(31,34,48,0.28)]">
                <div className="mb-4 grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#f2f0fc] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#9184d9]">
                  <m.icon className="h-[18px] w-[18px] text-[#7f70d0] transition-colors duration-300 group-hover:text-white" strokeWidth={2} />
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

      <section id="sistema" className="bg-[#161829] text-[#ebebec]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-[92px]">
          <div className="mb-14 max-w-[640px]">
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#9184d9]">
              Un solo sistema
            </div>
            <h2 className="mb-3.5 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#f4f4f6] sm:text-[34px]">
              El dato se digita una vez y llega a donde tiene que llegar.
            </h2>
            <p className="text-[16.5px] leading-[1.65] text-[#a6aabf]">
              Sin integraciones que mantener ni exportaciones entre áreas. Así viaja una matrícula el primer día de
              clases:
            </p>
          </div>

          <div className="rounded-2xl border border-[#31374b] bg-[#242a3c] p-6 pb-7 sm:p-8">
            <div className="relative mx-1.5 mb-6.5 h-[3px] rounded-full bg-[#31374b]">
              <div
                className="absolute -top-[3px] h-[9px] w-[9px] animate-[eduapp-travel_6s_linear_infinite] rounded-full bg-[#9184d9] shadow-[0_0_0_4px_rgba(145,132,217,0.18)]"
                style={{ left: 0 }}
              />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {FLOW.map((f, i) => (
                <Reveal key={f.step} delay={i * 80}>
                  <div className="group rounded-[11px] border border-[#31374b] bg-[#1c2131] p-[18px] pb-5 transition-colors duration-300 hover:border-[#484f6c]">
                    <div className="mb-3.5 flex items-center justify-between">
                      <div className="grid h-7 w-7 place-items-center rounded-md bg-[#242a3c] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#9184d9]">
                        <f.icon
                          className="h-3.5 w-3.5 text-[#9184d9] transition-colors duration-300 group-hover:text-white"
                          strokeWidth={2.25}
                        />
                      </div>
                      <span className="text-[10.5px] uppercase tracking-[0.07em] text-[#6d7391]">{f.role}</span>
                    </div>
                    <div className="mb-2 flex items-baseline gap-1.5">
                      <span className="font-mono text-[11px] text-[#9184d9]">{f.step}</span>
                      <span className="text-[15.5px] font-semibold text-[#f0f0f3]">{f.title}</span>
                    </div>
                    <div className="text-[13.5px] leading-relaxed text-[#9ba0b6]">{f.body}</div>
                    <div className="mt-4 border-t border-dashed border-[#333a50] pt-3.5 font-mono text-[11px] leading-relaxed text-[#7d84a0]">
                      {f.data}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-[10px] border border-[#31374b] border-l-[3px] border-l-[#9184d9] bg-[#1c2131] px-[18px] py-4">
              <div className="text-sm leading-relaxed text-[#b9bdd0]">
                <strong className="font-semibold text-[#f0f0f3]">Reglas de negocio reales:</strong> si el estudiante
                tiene pensión vencida, el sistema bloquea su matrícula del año siguiente. Nadie revisa una lista
                aparte.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="seguridad" className="border-b border-[#e2e5f0] bg-white">
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-12 px-5 py-16 sm:px-8 sm:py-[88px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#9184d9]">Seguridad</div>
            <h2 className="mb-4 text-[26px] font-semibold leading-[1.18] tracking-[-0.03em] sm:text-[32px]">
              Un colegio maneja datos de menores de edad.
            </h2>
            <p className="mb-5 text-base leading-[1.65] text-[#4c516a]">
              Los permisos son por rol y por alcance: una docente ve las notas de sus cursos, no las de todo el
              colegio; la secretaría ve cartera, no historias clínicas.
            </p>
            <p className="text-sm leading-[1.65] text-[#6c7189]">
              Cada institución vive en su propio espacio aislado, con copias de respaldo diarias y registro de quién
              consultó o modificó cada dato.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {SECURITY.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <div className="group rounded-[11px] border border-[#e6e8f2] p-5 transition-colors duration-300 hover:border-[#bfb6ea]">
                  <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[#f2f0fc] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#9184d9]">
                    <s.icon
                      className="h-4 w-4 text-[#7f70d0] transition-colors duration-300 group-hover:text-white"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="mb-[7px] text-[14.5px] font-semibold">{s.title}</div>
                  <div className="text-[13.5px] leading-relaxed text-[#6c7189]">{s.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-[1180px] px-5 py-16 pb-16 sm:px-8 sm:py-[88px] sm:pb-24">
        <Reveal>
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#e2e5f0] bg-white lg:grid-cols-2">
          <div className="px-6 py-9 sm:px-11 sm:py-12">
            <h2 className="mb-4 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
              Agendemos 30 minutos.
            </h2>
            <p className="mb-6.5 text-base leading-[1.65] text-[#4c516a]">
              Le mostramos el sistema con un caso parecido al suyo: estudiantes, pensiones y cómo migrar sus archivos
              actuales.
            </p>
            <div className="flex flex-col gap-3">
              {DEMO_POINTS.map((d) => (
                <div key={d} className="flex items-start gap-2.5 text-sm leading-[1.55] text-[#4c516a]">
                  <CheckCircle2 className="mt-[1px] h-4 w-4 flex-none text-[#9184d9]" strokeWidth={2} />
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[#e6e8f2] bg-[#fafbfe] px-6 py-9 sm:px-11 sm:py-11 lg:border-l lg:border-t-0">
            {sent ? (
              <div className="flex h-full flex-col justify-center">
                <div className="mb-4 grid h-[34px] w-[34px] place-items-center rounded-full bg-[#eeecf9]">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#9184d9]" />
                </div>
                <div className="mb-2 text-[19px] font-semibold">Recibimos su solicitud.</div>
                <div className="text-[14.5px] leading-relaxed text-[#6c7189]">
                  Le escribimos dentro del siguiente día hábil para acordar fecha y hora.
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
              >
                <div className="mb-[18px] text-[13px] font-semibold text-[#4c516a]">Solicitar demostración</div>
                <div className="flex flex-col gap-3.5">
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] text-[#6c7189]">Nombre y cargo</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Marta Ruiz — Rectora"
                      className="w-full rounded-lg border border-[#d9dcea] bg-white px-3.5 py-2.5 text-sm text-[#1f2230] outline-none focus:border-[#9184d9] focus:ring-[3px] focus:ring-[#9184d9]/[0.16]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] text-[#6c7189]">Colegio</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Colegio San José"
                      className="w-full rounded-lg border border-[#d9dcea] bg-white px-3.5 py-2.5 text-sm text-[#1f2230] outline-none focus:border-[#9184d9] focus:ring-[3px] focus:ring-[#9184d9]/[0.16]"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] text-[#6c7189]">Correo</span>
                      <input
                        type="email"
                        required
                        placeholder="rectoria@colegio.edu.co"
                        className="w-full rounded-lg border border-[#d9dcea] bg-white px-3.5 py-2.5 text-sm text-[#1f2230] outline-none focus:border-[#9184d9] focus:ring-[3px] focus:ring-[#9184d9]/[0.16]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] text-[#6c7189]">Teléfono</span>
                      <input
                        type="tel"
                        required
                        placeholder="+57 300 000 0000"
                        className="w-full rounded-lg border border-[#d9dcea] bg-white px-3.5 py-2.5 text-sm text-[#1f2230] outline-none focus:border-[#9184d9] focus:ring-[3px] focus:ring-[#9184d9]/[0.16]"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="mt-1 w-full rounded-[9px] bg-[#9184d9] py-[13px] text-[15px] font-medium text-white hover:bg-[#7f70d0]"
                  >
                    Agendar una demo
                  </button>
                  <div className="text-xs leading-relaxed text-[#868ba3]">
                    Usamos sus datos únicamente para contactarlo por esta solicitud.
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
        </Reveal>
      </section>

      <footer className="border-t border-[#e2e5f0] bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-8 px-5 py-11 sm:px-8 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Logo size={22} dot={7} radius={6} />
            <span className="text-sm font-semibold">Skolaria</span>
            <span className="ml-2 text-[13px] text-[#868ba3]">Gestión educativa integral · Bogotá, Colombia</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#modulos" className="text-[13px] text-[#6c7189]">
              Módulos
            </a>
            <a href="#seguridad" className="text-[13px] text-[#6c7189]">
              Tratamiento de datos
            </a>
            <a href="#demo" className="text-[13px] text-[#6c7189]">
              Contacto
            </a>
            <span className="text-[13px] text-[#a2a7bd]">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
