import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import '../styles/globals.css';
import { Providers } from './providers';
import { getTenantBranding } from '@/lib/server-api';
import { hexToHslTriple } from '@/lib/color';

export const metadata: Metadata = {
  title: 'Skolaria',
  description: 'Plataforma educativa multitenant para gestión académica y administrativa.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#152238',
};

// Bloqueante: aplica .dark antes del primer paint (evita flash del tema
// incorrecto). Lee la preferencia guardada o, si no hay, prefers-color-scheme.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getTenantBranding();
  const primaryHsl = hexToHslTriple(branding.primaryColor);

  return (
    <html lang="es" style={{ '--primary': primaryHsl } as React.CSSProperties}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
