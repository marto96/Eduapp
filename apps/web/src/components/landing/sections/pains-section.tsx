'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Reveal } from '../shared/reveal';

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

export function PainsSection() {
  return (
    <section className="relative border-y border-[#e2e5f0] bg-white">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-[88px]">
        <Reveal>
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
        </Reveal>
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#e6e8f2]">
          {PAINS.map((p, i) => (
            <div key={p.painTitle} className="grid grid-cols-1 border-t border-[#e6e8f2] sm:grid-cols-[1fr_1.15fr]">
              <Reveal delay={i * 80} direction="left" className="bg-[#fafbfe] px-6 py-6 sm:px-7">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-[#a2a7bd]">
                  <AlertCircle className="h-3 w-3" strokeWidth={2.25} />
                  Hoy
                </div>
                <div className="mb-1.5 text-base font-medium">{p.painTitle}</div>
                <div className="text-sm leading-[1.55] text-[#6c7189]">{p.painBody}</div>
              </Reveal>
              <Reveal
                delay={i * 80 + 90}
                direction="right"
                className="border-t border-[#e6e8f2] px-6 py-6 sm:border-l sm:border-t-0 sm:px-7"
              >
                <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.07em] text-[#9184d9]">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.25} />
                  Con Skolaria
                </div>
                <div className="mb-1.5 text-base font-medium">{p.fixTitle}</div>
                <div className="text-sm leading-[1.55] text-[#4c516a]">{p.fixBody}</div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
