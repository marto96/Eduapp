import { GuardianAccessService } from './guardian-access.service';
import { GuardianLinkRepositoryPort } from '../ports/guardian-link.repository.port';
import { GuardianLink } from '../../domain/entities/guardian-link.entity';

describe('GuardianAccessService', () => {
  const links: jest.Mocked<GuardianLinkRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const service = new GuardianAccessService(links);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChildrenIds', () => {
    it('devuelve solo los hijos con vínculo aprobado', async () => {
      links.findAll.mockResolvedValue([
        new GuardianLink('link-1', 'guardian-1', 'student-1', 'approved'),
        new GuardianLink('link-2', 'guardian-1', 'student-2', 'pending'),
      ]);

      const result = await service.getChildrenIds('guardian-1');

      expect(result).toEqual(['student-1']);
      expect(links.findAll).toHaveBeenCalledWith({ guardianUserId: 'guardian-1' });
    });
  });

  describe('getGuardianIds', () => {
    it('devuelve solo los acudientes con vínculo aprobado', async () => {
      links.findAll.mockResolvedValue([
        new GuardianLink('link-1', 'guardian-1', 'student-1', 'approved'),
        new GuardianLink('link-2', 'guardian-2', 'student-1', 'pending'),
      ]);

      const result = await service.getGuardianIds('student-1');

      expect(result).toEqual(['guardian-1']);
      expect(links.findAll).toHaveBeenCalledWith({ studentUserId: 'student-1' });
    });

    it('devuelve una lista vacía si el estudiante no tiene acudientes vinculados', async () => {
      links.findAll.mockResolvedValue([]);

      await expect(service.getGuardianIds('student-1')).resolves.toEqual([]);
    });
  });
});
