'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Panel' },
  { href: '/academic/years', label: 'Años lectivos' },
  { href: '/academic/grades', label: 'Grados' },
  { href: '/academic/sections', label: 'Secciones' },
  { href: '/academic/subjects', label: 'Asignaturas' },
  { href: '/schedule', label: 'Horarios' },
  { href: '/enrollment', label: 'Matrícula' },
  { href: '/attendance', label: 'Asistencia' },
  { href: '/grading', label: 'Calificaciones' },
  { href: '/users', label: 'Usuarios' },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-4 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            pathname === link.href
              ? 'text-primary underline'
              : 'text-muted-foreground hover:underline',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
