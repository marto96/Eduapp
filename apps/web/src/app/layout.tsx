import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'EduApp',
  description: 'Plataforma educativa multitenant para gestión académica y administrativa.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#152238',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
