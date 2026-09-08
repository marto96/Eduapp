'use client';

import { useRef, useState } from 'react';
import { Logo } from '../shared/logo';
import { ensureGsapRegistered, useGSAP, ScrollTrigger } from '../shared/gsap-config';

/**
 * El header arranca transparente sobre el hero oscuro (texto blanco) y pasa
 * a la barra clara con blur en cuanto el hero termina de salir de pantalla —
 * mismo truco que usan la mayoría de los sitios premium con un hero oscuro
 * seguido de contenido claro, para que la barra nunca "pelee" visualmente
 * con lo que tiene detrás.
 */
export function LandingNav({ heroRef }: { heroRef: React.RefObject<HTMLElement> }) {
  ensureGsapRegistered();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!heroRef.current) return;
    const trigger = ScrollTrigger.create({
      trigger: heroRef.current,
      start: 'bottom top+=64',
      onEnter: () => setScrolledPastHero(true),
      onLeaveBack: () => setScrolledPastHero(false),
    });
    return () => trigger.kill();
  }, [heroRef]);

  return (
    <header
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-500 ${
        scrolledPastHero
          ? 'border-[#dcdfec] bg-[#eef0f8]/90 backdrop-blur-md'
          : 'border-white/0 bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span
            className={`text-[17px] font-semibold tracking-[-0.02em] transition-colors duration-500 ${
              scrolledPastHero ? 'text-[#1f2230]' : 'text-white'
            }`}
          >
            Skolaria
          </span>
        </div>
        <nav className="flex items-center gap-5 sm:gap-7">
          {[
            { href: '#modulos', label: 'Módulos' },
            { href: '#sistema', label: 'Un solo sistema' },
            { href: '#seguridad', label: 'Seguridad' },
            { href: '/login', label: 'Iniciar sesión' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`hidden text-sm no-underline transition-colors md:inline ${
                scrolledPastHero
                  ? 'text-[#5d6178] hover:text-[#1f2230]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#demo"
            className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition-colors ${
              scrolledPastHero
                ? 'bg-[#1f2230] text-white hover:bg-[#32364a]'
                : 'bg-white text-[#1f2230] hover:bg-white/90'
            }`}
          >
            Agendar una demo
          </a>
        </nav>
      </div>
    </header>
  );
}
