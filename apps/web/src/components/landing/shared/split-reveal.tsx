'use client';

import { useRef } from 'react';
import { ensureGsapRegistered, useGSAP, gsap } from './gsap-config';

/**
 * Titular que aparece palabra por palabra, cada una "subiendo" desde detrás
 * de una máscara — el efecto de reveal tipográfico que distingue un hero
 * premium de un simple fade-in. Cada palabra vive en su propio contenedor
 * con `overflow-hidden` (la máscara) y un `span` interno que se traduce en Y.
 * No depende del plugin SplitText (de pago en versiones viejas de GSAP) —
 * el split de palabras se hace a mano en JSX, que alcanza para este caso.
 */
export function SplitReveal({
  text,
  as: Tag = 'span',
  className = '',
  delay = 0,
  trigger,
}: {
  text: string;
  as?: 'span' | 'h1' | 'h2';
  className?: string;
  delay?: number;
  /** Si se pasa, la animación se dispara cuando ESTE elemento entra en viewport (útil si el texto ya está visible al cargar, p. ej. el hero). Si no, se dispara con el propio texto. */
  trigger?: React.RefObject<HTMLElement>;
}) {
  ensureGsapRegistered();
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(' ');

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const targets = ref.current?.querySelectorAll('[data-word-inner]');
        if (!targets?.length) return;
        gsap.fromTo(
          targets,
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: 'power4.out',
            stagger: 0.045,
            delay: delay / 1000,
            scrollTrigger: trigger?.current
              ? { trigger: trigger.current, start: 'top 85%', once: true }
              : undefined,
          },
        );
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(ref.current?.querySelectorAll('[data-word-inner]') ?? [], { yPercent: 0 });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [text, delay] },
  );

  return (
    <Tag ref={ref as never} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <span data-word-inner className="inline-block will-change-transform">
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </Tag>
  );
}
