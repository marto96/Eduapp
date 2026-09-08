'use client';

import { Building2, History, RefreshCw, ShieldCheck, type LucideIcon } from 'lucide-react';
import { ParallaxImage } from '../shared/parallax-image';
import { Reveal } from '../shared/reveal';

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

export function SecuritySection() {
  return (
    <section id="seguridad" className="relative overflow-hidden border-b border-[#e2e5f0] bg-white">
      <ParallaxImage src="/landing/security-bg.webp" alt="" strength={8} className="opacity-[0.05] grayscale" />
      <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-12 px-5 py-16 sm:px-8 sm:py-[88px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal direction="left">
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
        </Reveal>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {SECURITY.map((s, i) => (
            <Reveal key={s.title} delay={i * 70} direction="right">
              <div className="group rounded-[11px] border border-[#e6e8f2] bg-white/70 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-[#bfb6ea]">
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
  );
}
