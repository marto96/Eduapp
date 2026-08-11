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
  /** Roles que ven este link en el sidebar — mismo criterio que `lib/permissions.ts`/`AbilityFactory`. */
  roles: string[];
}

const ADMIN = ['admin_institucion', 'directivo'];
const ADMIN_SECRETARIA = [...ADMIN, 'secretaria'];
const ADMIN_DOCENTE = [...ADMIN, 'docente'];
const ADMIN_SECRETARIA_DOCENTE = [...ADMIN, 'secretaria', 'docente'];
const GUARDIAN_STUDENT = ['estudiante', 'padre_tutor'];
const EVERYONE = [...ADMIN, 'secretaria', 'docente', ...GUARDIAN_STUDENT];

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard, roles: EVERYONE },
  { href: '/academic/years', label: 'Años lectivos', icon: CalendarRange, roles: ADMIN },
  { href: '/academic/grades', label: 'Grados', icon: GraduationCap, roles: ADMIN },
  { href: '/academic/sections', label: 'Secciones', icon: LayoutGrid, roles: ADMIN },
  { href: '/academic/subjects', label: 'Asignaturas', icon: BookOpen, roles: ADMIN },
  { href: '/schedule', label: 'Horarios', icon: Clock, roles: ADMIN_SECRETARIA_DOCENTE },
  { href: '/enrollment', label: 'Matrícula', icon: ClipboardList, roles: ADMIN_SECRETARIA_DOCENTE },
  { href: '/attendance', label: 'Asistencia', icon: CheckSquare, roles: ADMIN_DOCENTE },
  { href: '/grading', label: 'Calificaciones', icon: BarChart3, roles: ADMIN_DOCENTE },
  { href: '/finance', label: 'Finanzas', icon: Wallet, roles: ADMIN_SECRETARIA },
  { href: '/hr', label: 'RRHH', icon: Briefcase, roles: ADMIN_SECRETARIA },
  { href: '/documents', label: 'Documentos', icon: FileText, roles: ADMIN_SECRETARIA },
  { href: '/users', label: 'Usuarios', icon: Users, roles: ADMIN },
  { href: '/portal', label: 'Mi familia', icon: Home, roles: GUARDIAN_STUDENT },
  { href: '/announcements', label: 'Comunicados', icon: Megaphone, roles: EVERYONE },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays, roles: EVERYONE },
  { href: '/messages', label: 'Mensajes', icon: MessageCircle, roles: EVERYONE },
  { href: '/surveys', label: 'Encuestas', icon: ListChecks, roles: EVERYONE },
  { href: '/library', label: 'Biblioteca', icon: Library, roles: EVERYONE },
];
