import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { TeacherSectionsService } from '../../../schedule/application/services/teacher-sections.service';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

/**
 * Resuelve qué secciones puede ver cada usuario para filtrar comunicados/
 * eventos segmentados (`sectionId` no nulo). `null` = sin restricción
 * (staff, ve todo, segmentado o no). Mismo cruce de fuentes que ya usa
 * `EnrollmentAccessService`/`MessagingPolicyService` — `TeacherSectionsService`
 * para docente, matrículas propias para estudiante, matrículas de los
 * hijos aprobados para padre_tutor.
 */
@Injectable()
export class AudienceAccessService {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly teacherSections: TeacherSectionsService,
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  async getVisibleSectionIds(currentUser: JwtPayload): Promise<Set<string> | null> {
    const roles = currentUser.roles;

    if (
      roles.includes('admin_institucion') ||
      roles.includes('directivo') ||
      roles.includes('secretaria')
    ) {
      return null;
    }

    if (roles.includes('docente')) {
      return this.teacherSections.getAccessibleSectionIds(currentUser.sub);
    }

    if (roles.includes('estudiante')) {
      const own = await this.enrollments.findAll({ studentId: currentUser.sub });
      return new Set(own.map((e) => e.sectionId));
    }

    if (roles.includes('padre_tutor')) {
      const childrenIds = await this.guardianAccess.getChildrenIds(currentUser.sub);
      const lists = await Promise.all(
        childrenIds.map((studentId) => this.enrollments.findAll({ studentId })),
      );
      return new Set(lists.flat().map((e) => e.sectionId));
    }

    return new Set();
  }
}
