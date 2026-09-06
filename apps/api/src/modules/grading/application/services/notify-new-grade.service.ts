import { Inject, Injectable, Logger } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { SendMessageUseCase } from '../../../communication/application/use-cases/send-message.use-case';
import { Evaluation } from '../../domain/entities/evaluation.entity';

/**
 * Aviso automático al estudiante y a sus acudientes cuando se carga una
 * nota NUEVA (no cuando se edita una ya existente — eso lo decide
 * `RecordScoresUseCase` antes de llamar acá). Mejor esfuerzo: un fallo al
 * enviar un mensaje puntual no debe tumbar el guardado de la nota, que ya
 * ocurrió antes de esta llamada.
 */
@Injectable()
export class NotifyNewGradeService {
  private readonly logger = new Logger(NotifyNewGradeService.name);

  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    private readonly guardianAccess: GuardianAccessService,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  async notify(evaluation: Evaluation, enrollmentId: string, score: number, senderId: string): Promise<void> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) return;

    const [allSubjects, period] = await Promise.all([
      this.subjects.findAll(),
      this.periods.findById(evaluation.periodId),
    ]);
    const subjectName = allSubjects.find((s) => s.id === evaluation.subjectId)?.name ?? 'una materia';
    const periodName = period?.name ?? 'un periodo';
    const body = `Se cargó una nota nueva: ${subjectName} — ${periodName}: ${score}/${evaluation.maxScore}.`;

    const guardianIds = await this.guardianAccess.getGuardianIds(enrollment.studentId);
    const recipientIds = [enrollment.studentId, ...guardianIds];

    for (const recipientId of recipientIds) {
      try {
        await this.sendMessage.execute({ senderId, recipientId, body });
      } catch (err) {
        this.logger.warn(`No se pudo notificar la nota nueva a "${recipientId}": ${(err as Error).message}`);
      }
    }
  }
}
