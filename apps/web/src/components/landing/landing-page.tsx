'use client';

import { useRef } from 'react';
import { LandingNav } from './sections/landing-nav';
import { HeroSection } from './sections/hero-section';
import { PainsSection } from './sections/pains-section';
import { ModulesSection } from './sections/modules-section';
import { SystemFlowSection } from './sections/system-flow-section';
import { SecuritySection } from './sections/security-section';
import { DemoSection } from './sections/demo-section';
import { LandingFooter } from './sections/landing-footer';
import { NoiseOverlay } from './shared/noise-overlay';

export function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="w-full overflow-x-hidden bg-[#eef0f8] font-sans text-[#1f2230]">
      <NoiseOverlay />
      <LandingNav heroRef={heroRef} />
      <HeroSection sectionRef={heroRef} />
      <PainsSection />
      <ModulesSection />
      <SystemFlowSection />
      <SecuritySection />
      <DemoSection />
      <LandingFooter />
    </div>
  );
}
