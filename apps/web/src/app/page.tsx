import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'Skolaria — Gestión educativa integral para colegios',
};

export default function HomePage() {
  return <LandingPage />;
}
