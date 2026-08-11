import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { TeacherSectionsService } from '../../../schedule/application/services/teacher-sections.service';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

/**
 * Resuelve "instance-level CASL" para `enrollments`: quién puede ver qué
 * matrícula, más allá de si tiene permiso de lectura sobre el tipo de
 * recurso (eso ya lo resuelve `AbilityFactory`). Vive acá porque
 * `Enrollment` es el punto de cruce natural entre las tres fuentes de
 * restricción: `schedules` (secciones del docente), `guardians` (hijos
 * del padre_tutor) y el propio usuario (estudiante).
 */
@Injectable()
export class EnrollmentAccessService {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly teacherSections: TeacherSectionsService,
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  /** `null` = sin restricción (admin_institucion/directivo/secretaria ven todo). */
  async resolveAccessibleEnrollmentIds(currentUser: JwtPayload): Promise<Set<string> | null> {
    const roles = currentUser.roles;

    if (
      roles.includes('admin_institucion') ||
      roles.includes('directivo') ||
      roles.includes('secretaria')
    ) {
      return null;
    }

    if (roles.includes('docente')) {
      const sectionIds = await this.teacherSections.getAccessibleSectionIds(currentUser.sub);
      const all = await this.enrollments.findAll();
      return new Set(all.filter((e) => sectionIds.has(e.sectionId)).map((e) => e.id));
    }

    if (roles.includes('estudiante')) {
      const own = await this.enrollments.findAll({ studentId: currentUser.sub });
      return new Set(own.map((e) => e.id));
    }

    if (roles.includes('padre_tutor')) {
      const childrenIds = await this.guardianAccess.getChildrenIds(currentUser.sub);
      const lists = await Promise.all(
        childrenIds.map((studentId) => this.enrollments.findAll({ studentId })),
      );
      return new Set(lists.flat().map((e) => e.id));
    }

    return new Set();
  }

  /**
   * Para la escritura (tomar asistencia, cargar notas): `true` de entrada
   * si el rol no es `docente` — esta función no reemplaza a CASL, solo
   * agrega la restricción de instancia sobre el `docente`, que ya tiene
   * permiso de tipo-de-recurso vía `AbilityFactory`.
   */
  async canTeacherAccessSection(currentUser: JwtPayload, sectionId: string): Promise<boolean> {
    if (!currentUser.roles.includes('docente')) return true;
    if (currentUser.roles.includes('admin_institucion') || currentUser.roles.includes('directivo')) {
      return true;
    }
    const sectionIds = await this.teacherSections.getAccessibleSectionIds(currentUser.sub);
    return sectionIds.has(sectionId);
  }
}
