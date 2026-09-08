'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ParallaxImage } from '../shared/parallax-image';
import { Reveal } from '../shared/reveal';

const DEMO_POINTS = [
  'Recorrido por matrícula, académico y finanzas con datos de ejemplo.',
  'Cómo migrar sus planillas actuales sin re-digitar el año en curso.',
  'Propuesta de implementación por etapas y costo según número de estudiantes.',
];

export function DemoSection() {
  const [sent, setSent] = useState(false);

  return (
    <section id="demo" className="relative mx-auto max-w-[1180px] px-5 py-16 pb-16 sm:px-8 sm:py-[88px] sm:pb-24">
      <Reveal>
        <div className="relative grid grid-cols-1 overflow-hidden rounded-2xl border border-[#e2e5f0] bg-white lg:grid-cols-2">
          <ParallaxImage
            src="/landing/hero-bg.webp"
            alt=""
            strength={10}
            className="-z-10 opacity-[0.08] [filter:grayscale(1)_sepia(1)_hue-rotate(210deg)_saturate(3)]"
          />
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
          <div className="border-t border-[#e6e8f2] bg-[#fafbfe]/90 px-6 py-9 backdrop-blur-sm sm:px-11 sm:py-11 lg:border-l lg:border-t-0">
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
                    className="mt-1 w-full rounded-[9px] bg-[#9184d9] py-[13px] text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-[#7f70d0]"
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
  );
}
