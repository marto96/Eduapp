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
  PieChart,
  UserPlus,
  ClipboardCheck,
  Building2,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles que ven este link en el sidebar — mismo criterio que `lib/permissions.ts`/`AbilityFactory`. */
  roles: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  links: NavLink[];
}

export type NavItem = ({ type: 'link' } & NavLink) | ({ type: 'group' } & NavGroup);

const ADMIN = ['admin_institucion', 'directivo'];
const ADMIN_SECRETARIA = [...ADMIN, 'secretaria'];
const ADMIN_DOCENTE = [...ADMIN, 'docente'];
const ADMIN_SECRETARIA_DOCENTE = [...ADMIN, 'secretaria', 'docente'];
const GUARDIAN_STUDENT = ['estudiante', 'padre_tutor'];
const EVERYONE = [...ADMIN, 'secretaria', 'docente', ...GUARDIAN_STUDENT];

export const NAV_ITEMS: NavItem[] = [
  { type: 'link', href: '/dashboard', label: 'Panel', icon: LayoutDashboard, roles: EVERYONE },
  { type: 'link', href: '/portal', label: 'Mi familia', icon: Home, roles: GUARDIAN_STUDENT },
  {
    type: 'group',
    id: 'academico',
    label: 'Académico',
    icon: GraduationCap,
    links: [
      { href: '/academic/years', label: 'Años lectivos', icon: CalendarRange, roles: ADMIN },
      { href: '/academic/grades', label: 'Grados', icon: GraduationCap, roles: ADMIN },
      { href: '/academic/sections', label: 'Secciones', icon: LayoutGrid, roles: ADMIN },
      { href: '/academic/subjects', label: 'Asignaturas', icon: BookOpen, roles: ADMIN },
      { href: '/schedule', label: 'Horarios', icon: Clock, roles: ADMIN_SECRETARIA_DOCENTE },
      { href: '/enrollment', label: 'Matrícula', icon: ClipboardList, roles: ADMIN_SECRETARIA_DOCENTE },
      { href: '/admissions', label: 'Admisiones', icon: UserPlus, roles: ADMIN_SECRETARIA },
    ],
  },
  {
    type: 'group',
    id: 'seguimiento',
    label: 'Seguimiento',
    icon: ClipboardCheck,
    links: [
      { href: '/attendance', label: 'Asistencia', icon: CheckSquare, roles: ADMIN_DOCENTE },
      { href: '/grading', label: 'Calificaciones', icon: BarChart3, roles: ADMIN_DOCENTE },
      { href: '/reports', label: 'Reportes', icon: PieChart, roles: ADMIN_DOCENTE },
    ],
  },
  {
    type: 'group',
    id: 'administracion',
    label: 'Administración',
    icon: Building2,
    links: [
      { href: '/finance', label: 'Finanzas', icon: Wallet, roles: ADMIN_SECRETARIA },
      { href: '/hr', label: 'RRHH', icon: Briefcase, roles: ADMIN_SECRETARIA },
      { href: '/documents', label: 'Documentos', icon: FileText, roles: ADMIN_SECRETARIA },
      { href: '/users', label: 'Usuarios', icon: Users, roles: ADMIN },
    ],
  },
  {
    type: 'group',
    id: 'comunicacion',
    label: 'Comunicación',
    icon: MessagesSquare,
    links: [
      { href: '/announcements', label: 'Comunicados', icon: Megaphone, roles: EVERYONE },
      { href: '/calendar', label: 'Calendario', icon: CalendarDays, roles: EVERYONE },
      { href: '/messages', label: 'Mensajes', icon: MessageCircle, roles: EVERYONE },
      { href: '/surveys', label: 'Encuestas', icon: ListChecks, roles: EVERYONE },
    ],
  },
  { type: 'link', href: '/library', label: 'Biblioteca', icon: Library, roles: EVERYONE },
];

/** Todos los links, sueltos y dentro de grupos, en una sola lista — para buscar por href (ej. el título de la página actual) sin importarle la agrupación visual. */
export const ALL_NAV_LINKS: NavLink[] = NAV_ITEMS.flatMap((item) =>
  item.type === 'group' ? item.links : [item],
);
