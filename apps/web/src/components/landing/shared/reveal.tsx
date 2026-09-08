'use client';

import { useRef } from 'react';
import { ensureGsapRegistered, useGSAP, gsap } from './gsap-config';

type Direction = 'up' | 'left' | 'right' | 'none';

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  left: { x: -32, y: 0 },
  right: { x: 32, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Aparición de contenido al entrar en viewport — mismo rol que el viejo
 * `Reveal` basado en IntersectionObserver, pero animado con GSAP para poder
 * componerlo con el resto de la coreografía de scroll (parallax, pines) sin
 * mezclar dos sistemas de animación distintos en la misma página.
 */
export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
}) {
  ensureGsapRegistered();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const offset = OFFSETS[direction];
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          ref.current,
          { autoAlpha: 0, x: offset.x, y: offset.y },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            duration: 0.9,
            delay: delay / 1000,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 88%',
              once: true,
            },
          },
        );
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(ref.current, { autoAlpha: 1 });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [delay, direction] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
