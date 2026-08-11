import { Inject, Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { TeacherSectionsService } from '../../../schedule/application/services/teacher-sections.service';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { User, UserRole } from '../../../identity/domain/entities/user.entity';

const STAFF_ROLES: UserRole[] = ['admin_institucion', 'directivo', 'secretaria'];

/**
 * Regla de contacto de mensajería: el staff es un punto de contacto
 * abierto en ambos sentidos; docentes se coordinan libremente entre sí;
 * docente↔estudiante/padre_tutor requiere una relación real (sección
 * compartida, vía el mismo cruce que ya usa `EnrollmentAccessService`);
 * padre_tutor↔estudiante requiere que sea su propio hijo aprobado. Todo
 * lo demás (estudiante↔estudiante, padre↔padre, pares no emparentados)
 * queda bloqueado.
 */
@Injectable()
export class MessagingPolicyService {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly teacherSections: TeacherSectionsService,
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  async canMessage(senderId: string, recipientId: string): Promise<boolean> {
    const [sender, recipient] = await Promise.all([
      this.users.findById(senderId),
      this.users.findById(recipientId),
    ]);
    if (!sender || !recipient) return false;

    if (this.isStaff(sender) || this.isStaff(recipient)) return true;
    if (sender.hasRole('docente') && recipient.hasRole('docente')) return true;

    const teacher = sender.hasRole('docente') ? sender : recipient.hasRole('docente') ? recipient : null;
    if (teacher) {
      const other = teacher === sender ? recipient : sender;
      return this.isTeacherRelatedTo(teacher, other);
    }

    const guardian = sender.hasRole('padre_tutor')
      ? sender
      : recipient.hasRole('padre_tutor')
        ? recipient
        : null;
    if (guardian) {
      const other = guardian === sender ? recipient : sender;
      if (!other.hasRole('estudiante')) return false;
      const childrenIds = await this.guardianAccess.getChildrenIds(guardian.id);
      return childrenIds.includes(other.id);
    }

    return false;
  }

  private isStaff(user: User): boolean {
    return user.roles.some((role) => STAFF_ROLES.includes(role));
  }

  private async isTeacherRelatedTo(teacher: User, other: User): Promise<boolean> {
    if (!other.hasRole('estudiante') && !other.hasRole('padre_tutor')) return false;

    const sectionIds = await this.teacherSections.getAccessibleSectionIds(teacher.id);
    if (sectionIds.size === 0) return false;

    const studentIds = other.hasRole('estudiante')
      ? [other.id]
      : await this.guardianAccess.getChildrenIds(other.id);
    if (studentIds.length === 0) return false;

    const lists = await Promise.all(
      studentIds.map((studentId) => this.enrollments.findAll({ studentId })),
    );
    return lists.flat().some((enrollment) => sectionIds.has(enrollment.sectionId));
  }
}
