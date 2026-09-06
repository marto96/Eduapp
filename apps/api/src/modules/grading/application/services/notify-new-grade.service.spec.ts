import { NotifyNewGradeService } from './notify-new-grade.service';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { SendMessageUseCase } from '../../../communication/application/use-cases/send-message.use-case';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Subject } from '../../../academic/domain/entities/subject.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';

describe('NotifyNewGradeService', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const subjects: jest.Mocked<SubjectRepositoryPort> = {
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const periods: jest.Mocked<PeriodRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const guardianAccess = { getGuardianIds: jest.fn() } as unknown as jest.Mocked<GuardianAccessService>;
  const sendMessage = { execute: jest.fn() } as unknown as jest.Mocked<SendMessageUseCase>;

  const service = new NotifyNewGradeService(enrollments, subjects, periods, guardianAccess, sendMessage);

  const evaluation = new Evaluation('eval-1', 'subj-mat', 'section-1', 'year-2026', 'period-1', 'actividad', 5, null);

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(new Enrollment('enr-1', 'student-1', 'section-1', 'year-2026', 'active'));
    subjects.findAll.mockResolvedValue([new Subject('subj-mat', 'Matemática', 'Ciencias')]);
    periods.findById.mockResolvedValue(
      new Period('period-1', 'year-2026', 'Primer periodo', 1, 0.25, '2026-01-01', '2026-06-30'),
    );
    guardianAccess.getGuardianIds.mockResolvedValue([]);
  });

  it('no hace nada si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await service.notify(evaluation, 'enr-1', 4, 'teacher-1');

    expect(sendMessage.execute).not.toHaveBeenCalled();
  });

  it('notifica al estudiante con el detalle de la nota', async () => {
    await service.notify(evaluation, 'enr-1', 4, 'teacher-1');

    expect(sendMessage.execute).toHaveBeenCalledWith({
      senderId: 'teacher-1',
      recipientId: 'student-1',
      body: 'Se cargó una nota nueva: Matemática — Primer periodo: 4/5.',
    });
  });

  it('notifica también a cada acudiente aprobado', async () => {
    guardianAccess.getGuardianIds.mockResolvedValue(['guardian-1', 'guardian-2']);

    await service.notify(evaluation, 'enr-1', 4, 'teacher-1');

    expect(sendMessage.execute).toHaveBeenCalledTimes(3);
    expect(sendMessage.execute).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'student-1' }));
    expect(sendMessage.execute).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'guardian-1' }));
    expect(sendMessage.execute).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'guardian-2' }));
  });

  it('sigue notificando a los demás si el envío a un destinatario falla', async () => {
    guardianAccess.getGuardianIds.mockResolvedValue(['guardian-1']);
    sendMessage.execute
      .mockRejectedValueOnce(new Error('No podés escribirle a este usuario'))
      .mockResolvedValueOnce({} as never);

    await expect(service.notify(evaluation, 'enr-1', 4, 'teacher-1')).resolves.toBeUndefined();

    expect(sendMessage.execute).toHaveBeenCalledTimes(2);
  });
});
