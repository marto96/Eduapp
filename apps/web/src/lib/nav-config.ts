import {
  LayoutDashboard,
  CalendarRange,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  Clock,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Wallet,
  Briefcase,
  FileText,
  Users,
  Home,
  Megaphone,
  CalendarDays,
  MessageCircle,
  ListChecks,
  Library,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/academic/years', label: 'Años lectivos', icon: CalendarRange },
  { href: '/academic/grades', label: 'Grados', icon: GraduationCap },
  { href: '/academic/sections', label: 'Secciones', icon: LayoutGrid },
  { href: '/academic/subjects', label: 'Asignaturas', icon: BookOpen },
  { href: '/schedule', label: 'Horarios', icon: Clock },
  { href: '/enrollment', label: 'Matrícula', icon: ClipboardList },
  { href: '/attendance', label: 'Asistencia', icon: CheckSquare },
  { href: '/grading', label: 'Calificaciones', icon: BarChart3 },
  { href: '/finance', label: 'Finanzas', icon: Wallet },
  { href: '/hr', label: 'RRHH', icon: Briefcase },
  { href: '/documents', label: 'Documentos', icon: FileText },
  { href: '/users', label: 'Usuarios', icon: Users },
  { href: '/portal', label: 'Mi familia', icon: Home },
  { href: '/announcements', label: 'Comunicados', icon: Megaphone },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays },
  { href: '/messages', label: 'Mensajes', icon: MessageCircle },
  { href: '/surveys', label: 'Encuestas', icon: ListChecks },
  { href: '/library', label: 'Biblioteca', icon: Library },
];
