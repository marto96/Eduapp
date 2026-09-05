import { Injectable } from '@nestjs/common';
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { AppAbility } from './ability';
import { JwtPayload } from '../jwt-payload.interface';

/**
 * Construye las abilities del usuario a partir de los roles del JWT (ya
 * validados por tenant en `JwtStrategy`). Mismo comportamiento que tenía
 * `RolesGuard` (solo admin/directivo pueden crear estructura académica),
 * pero expresado como reglas reales por acción+recurso.
 */
@Injectable()
export class AbilityFactory {
  createForUser(payload: JwtPayload): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(Ability as AbilityClass<AppAbility>);
    const roles = payload.roles;

    if (roles.includes('admin_institucion')) {
      can('manage', 'all');
    }

    if (roles.includes('directivo')) {
      can('manage', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'User',
        'Enrollment',
        'Attendance',
        'Grading',
        'Schedule',
        'VirtualClass',
        'Finance',
        'Hr',
        'Document',
        'Announcement',
        'Event',
        'Message',
        'Survey',
        'SurveyResponse',
        'Book',
        'Loan',
        'Report',
        'Admission',
      ]);
      can('read', 'all');
      // Excepción explícita al `can('read', 'all')` de arriba: 'all' en CASL
      // matchea cualquier subject check (incluido 'AuditLog'), así que sin
      // este `cannot` directivo podría leer /audit-logs pese a que ningún
      // rol que no sea admin_institucion lo lista explícitamente. Un
      // `cannot` agregado después de un `can` lo overridea para ese
      // action+subject puntual, sin tocar el resto de subjects que
      // directivo sí puede leer.
      //
      // Guardado detrás de `!admin_institucion`: CASL resuelve la última
      // regla que matchea, así que un usuario con AMBOS roles (combinación
      // real y creable desde Usuarios) vería este `cannot` pisar el
      // `can('manage', 'all')` del bloque admin_institucion de arriba pese a
      // ser admin — el carve-out es solo para directivo "puro".
      if (!roles.includes('admin_institucion')) {
        cannot('read', 'AuditLog');
      }
    }

    if (roles.includes('docente')) {
      // A diferencia del resto de docente/secretaria/estudiante/padre_tutor
      // (solo lectura): asistencia y calificaciones son tarea diaria del
      // docente, así que acá sí puede crear/editar (sin nivel de instancia
      // todavía — ve y marca cualquier sección, no solo las suyas, porque no
      // existe el concepto de "secciones asignadas a un docente" sin horarios).
      // 'VirtualClass' SÍ tiene chequeo de instancia, pero vive en el
      // use-case (SetScheduleVirtualUseCase/CancelClassSessionUseCase
      // comparan `schedule.teacherId === currentUser.sub`), no acá — CASL
      // solo autoriza "puede tocar VirtualClass en general".
      can('manage', ['Attendance', 'Grading', 'VirtualClass']);
    }

    if (roles.includes('secretaria')) {
      // Igual que el docente con Attendance/Grading: cargar cargos/pagos,
      // legajos/licencias y emitir documentos es tarea administrativa
      // diaria de secretaría, no exclusiva de dirección. A diferencia de
      // Finance/Document, 'Hr' NO se agrega al bloque de lectura
      // compartido de abajo — legajos de personal no son visibles para
      // docente/estudiante/padre_tutor, ni siquiera en modo lectura (ver
      // EmployeesController/LeavesController).
      can('manage', ['Finance', 'Hr', 'Document', 'Announcement', 'Event', 'Survey', 'Book', 'Loan', 'Admission']);
    }

    if (roles.some((role) => ['docente', 'secretaria', 'estudiante', 'padre_tutor'].includes(role))) {
      // 'read' en User (no 'manage': no pueden crear/editar) para poder
      // resolver nombres en listados que referencian usuarios (ej. la
      // matrícula muestra "Juan Pérez", no un UUID).
      can('read', [
        'AcademicYear',
        'Grade',
        'Section',
        'Subject',
        'Enrollment',
        'User',
        'Attendance',
        'Grading',
        'Schedule',
        'VirtualClass',
        'Finance',
        'Document',
        'Announcement',
        'Event',
        'Survey',
        'Book',
      ]);
      // A diferencia de todo lo anterior (donde este bloque es de solo
      // lectura y la gestión queda para admin/directivo/secretaria), acá
      // 'manage' es para todos: mensajería es entre pares (docente-padre,
      // docente-estudiante...), no una publicación institucional — la
      // privacidad real la da el filtro por participación en
      // ListMessagesUseCase/MarkMessageReadUseCase, no este chequeo de
      // tipo de recurso. Mismo criterio para 'SurveyResponse': cualquiera
      // puede responder una encuesta (a diferencia de 'Survey', que solo
      // admin/directivo/secretaria pueden crear).
      can('manage', ['Message', 'SurveyResponse']);
    }

    if (roles.includes('padre_tutor')) {
      // Autogestión del vínculo padre↔hijo: un padre_tutor puede
      // *solicitar* el vínculo (queda 'pending'), pero no aprobarlo — eso
      // sigue siendo exclusivo de admin/directivo (can('manage','User')),
      // ver RequestGuardianLinkUseCase/ApproveGuardianLinkUseCase.
      can('create', 'GuardianLink');
    }

    return build();
  }
}
