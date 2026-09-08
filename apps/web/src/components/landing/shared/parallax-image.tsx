'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ensureGsapRegistered, useGSAP, gsap } from './gsap-config';

/**
 * Fondo de sección que se desplaza a distinta velocidad que el scroll real
 * (parallax) — es lo que da la sensación de profundidad/capas al bajar la
 * página, en vez de un fondo estático pegado al contenido.
 */
export function ParallaxImage({
  src,
  alt,
  strength = 18,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  /** Cuánto se desplaza la imagen respecto al scroll, en % de su propio alto. */
  strength?: number;
  className?: string;
  priority?: boolean;
}) {
  ensureGsapRegistered();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          imgWrapRef.current,
          { yPercent: -strength },
          {
            yPercent: strength,
            ease: 'none',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      <div ref={imgWrapRef} className="absolute inset-x-0 -top-[20%] -bottom-[20%]">
        <Image src={src} alt={alt} fill priority={priority} className="object-cover" sizes="100vw" />
      </div>
    </div>
  );
}
