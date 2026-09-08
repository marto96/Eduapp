'use client';

import { useRef } from 'react';
import { FileText, BookOpen, Wallet, Users, type LucideIcon } from 'lucide-react';
import { ensureGsapRegistered, useGSAP, gsap } from '../shared/gsap-config';
import { ParallaxImage } from '../shared/parallax-image';
import { Reveal } from '../shared/reveal';

const FLOW: { step: string; role: string; title: string; icon: LucideIcon; body: string; data: string }[] = [
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

/**
 * La pieza central de la coreografía de scroll: la sección se fija en
 * pantalla un tramo, y a medida que se sigue bajando, la línea se llena y
 * cada paso se enciende en secuencia — el scroll deja de ser solo "pasar
 * páginas" y se convierte en avanzar el flujo mismo.
 */
export function SystemFlowSection() {
  ensureGsapRegistered();
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const lineFillRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-flow-card]', pinRef.current);

        gsap.set(cards, { autoAlpha: 0.28, y: 18 });
        gsap.set(lineFillRef.current, { scaleX: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=140%',
            scrub: 0.6,
            pin: true,
          },
        });

        tl.to(lineFillRef.current, { scaleX: 1, ease: 'none' }, 0);

        cards.forEach((card, i) => {
          tl.to(card, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, i * 0.24);
        });
      });

      // En mobile/reduced-motion no hay pin ni scrub — todo visible, con el
      // mismo reveal simple que el resto del sitio.
      mm.add('(prefers-reduced-motion: reduce), (max-width: 1023px)', () => {
        gsap.set('[data-flow-card]', { autoAlpha: 1, y: 0 });
        gsap.set(lineFillRef.current, { scaleX: 1 });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section id="sistema" ref={sectionRef} className="relative bg-[#161829] text-[#ebebec]">
      <ParallaxImage src="/landing/dark-bg.webp" alt="" strength={10} className="opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#161829] via-[#161829]/85 to-[#161829]" />

      <div ref={pinRef} className="relative mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-[92px]">
        <Reveal>
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
        </Reveal>

        <div className="rounded-2xl border border-[#31374b] bg-[#242a3c]/90 p-6 pb-7 backdrop-blur-sm sm:p-8">
          <div className="relative mx-1.5 mb-6.5 h-[3px] overflow-hidden rounded-full bg-[#31374b]">
            <div
              ref={lineFillRef}
              className="h-full origin-left rounded-full bg-gradient-to-r from-[#9184d9] to-[#c3bce8]"
            />
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((f) => (
              <div
                key={f.step}
                data-flow-card
                className="group rounded-[11px] border border-[#31374b] bg-[#1c2131] p-[18px] pb-5 transition-colors duration-300 hover:border-[#484f6c]"
              >
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
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-[10px] border border-[#31374b] border-l-[3px] border-l-[#9184d9] bg-[#1c2131] px-[18px] py-4">
            <div className="text-sm leading-relaxed text-[#b9bdd0]">
              <strong className="font-semibold text-[#f0f0f3]">Reglas de negocio reales:</strong> si el estudiante
              tiene pensión vencida, el sistema bloquea su matrícula del año siguiente. Nadie revisa una lista aparte.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
