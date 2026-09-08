'use client';

import { useRef, useState } from 'react';
import { ensureGsapRegistered, useGSAP, gsap, ScrollTrigger } from '../shared/gsap-config';
import { ParallaxImage } from '../shared/parallax-image';
import { SplitReveal } from '../shared/split-reveal';

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
  { name: 'Acosta Rivera, Ana', nota: 4.3, asis: 98, pay: 'Al día', payColor: '#4b7a58' },
  { name: 'Bermúdez Cruz, Juan', nota: 3.8, asis: 94, pay: 'Al día', payColor: '#4b7a58' },
  { name: 'Cárdenas Lara, Sofía', nota: 4.6, asis: 100, pay: 'Al día', payColor: '#4b7a58' },
  { name: 'Duarte Peña, Miguel', nota: 3.5, asis: 89, pay: 'Vencida', payColor: '#b4553f' },
  { name: 'Espinosa Gil, Valeria', nota: 4.2, asis: 97, pay: 'Al día', payColor: '#4b7a58' },
];

function AnimatedNumber({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  ensureGsapRegistered();
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const counter = { n: 0 };
      gsap.to(counter, {
        n: value,
        duration: 1.4,
        ease: 'power2.out',
        delay: 0.5,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => {
          el.textContent = counter.n.toFixed(decimals) + suffix;
        },
      });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => {
      el.textContent = value.toFixed(decimals) + suffix;
    });
    return () => mm.revert();
  }, [value]);

  return <span ref={ref}>0{suffix}</span>;
}

export function HeroSection({ sectionRef }: { sectionRef: React.RefObject<HTMLElement> }) {
  ensureGsapRegistered();
  const mockupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Entrada del mockup: sube desde abajo con leve rotación 3D.
        gsap.fromTo(
          mockupRef.current,
          { autoAlpha: 0, y: 60, rotateX: 8, rotateY: -6 },
          { autoAlpha: 1, y: 0, rotateX: 0, rotateY: 0, duration: 1.2, ease: 'power3.out', delay: 0.5 },
        );
        // Flotación idle sutil — el detalle que hace sentir "vivo" al mockup.
        gsap.to(mockupRef.current, {
          y: -10,
          duration: 3.2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.8,
        });
        // Capa de contenido: se desvanece y sube un poco más rápido que el
        // fondo al salir de pantalla — la sensación de "capas" al bajar.
        gsap.to(contentRef.current, {
          yPercent: -20,
          autoAlpha: 0.2,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative flex min-h-screen items-center overflow-hidden bg-[#0c0d16] pt-24"
    >
      <ParallaxImage src="/landing/cta-bg.webp" alt="" strength={14} priority className="opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0d16]/85 via-[#0c0d16]/70 to-[#0c0d16]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d16] via-[#0c0d16]/10 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0c0d16] to-transparent" />

      <div
        ref={contentRef}
        className="relative z-10 mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-14 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16"
      >
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-2 pr-3 text-[12.5px] text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a99bf0]" />
            Plataforma para colegios en Colombia
          </div>
          <SplitReveal
            as="h1"
            text="Toda la gestión de tu colegio, en un solo lugar."
            className="mb-5 block text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-[46px] lg:text-[58px]"
          />
          <p className="mb-8 max-w-[46ch] text-lg leading-relaxed text-white/70">
            Matrícula, calificaciones, asistencia, pensiones, pagos en línea y comunicación con las familias. Un dato
            se digita una vez y sirve para todo el año escolar.
          </p>
          <div className="mb-7 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="inline-flex items-center rounded-[9px] bg-[#9184d9] px-[22px] py-[13px] text-[15px] font-medium text-white no-underline shadow-[0_16px_36px_-14px_rgba(145,132,217,0.65)] transition-transform hover:-translate-y-0.5 hover:bg-[#a396e6]"
            >
              Agendar una demo
            </a>
            <a
              href="#modulos"
              className="inline-flex items-center rounded-[9px] border border-white/20 bg-white/[0.04] px-[22px] py-[13px] text-[15px] font-medium text-white no-underline backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:border-white/40"
            >
              Ver funcionalidades
            </a>
          </div>
          <p className="text-[13px] leading-relaxed text-white/45">
            Cada colegio con su propio subdominio y su color institucional. Sin instalaciones: se entra desde el
            navegador.
          </p>
        </div>

        <div style={{ perspective: 1400 }}>
          <div
            ref={mockupRef}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = (e.clientX - rect.left) / rect.width - 0.5;
              const py = (e.clientY - rect.top) / rect.height - 0.5;
              setTilt({ x: py * -6, y: px * 8 });
            }}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            className="relative opacity-0 transition-transform duration-300 ease-out"
            style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d' }}
          >
            <div className="absolute -inset-x-3 -bottom-[18px] top-[18px] rounded-2xl bg-white/[0.03] blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
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
                        <span className="h-[5px] w-[5px] flex-none rounded-[1px]" style={{ backgroundColor: nav.dot }} />
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
                      <div className="mt-0.5 text-[17px] font-semibold tabular-nums">
                        <AnimatedNumber value={4.1} decimals={1} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#eceef6] px-2.5 py-2.5">
                      <div className="text-[10.5px] text-[#868ba3]">Asistencia</div>
                      <div className="mt-0.5 text-[17px] font-semibold tabular-nums">
                        <AnimatedNumber value={96} suffix="%" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#eceef6] px-2.5 py-2.5">
                      <div className="text-[10.5px] text-[#868ba3]">Cartera</div>
                      <div className="mt-0.5 text-[17px] font-semibold tabular-nums text-[#b4553f]">
                        <AnimatedNumber value={3} />
                      </div>
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
                        <span className="tabular-nums">{row.nota.toFixed(1).replace('.', ',')}</span>
                        <span className="tabular-nums text-[#6c7189]">{row.asis}%</span>
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
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center">
        <div className="flex flex-col items-center gap-2 text-white/40">
          <span className="text-[10px] uppercase tracking-[0.2em]">Descubrí más</span>
          <span className="h-9 w-[1px] animate-pulse bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </div>
    </section>
  );
}
