import { SearchGuardianLinkCandidatesUseCase } from './search-guardian-link-candidates.use-case';
import { GuardianLinkCandidateRepositoryPort } from '../ports/guardian-link-candidate.repository.port';

describe('SearchGuardianLinkCandidatesUseCase', () => {
  const candidates: jest.Mocked<GuardianLinkCandidateRepositoryPort> = {
    search: jest.fn(),
  };

  const useCase = new SearchGuardianLinkCandidatesUseCase(candidates);

  beforeEach(() => jest.clearAllMocks());

  it('pasa el término de búsqueda y un límite de resultados al repositorio', async () => {
    candidates.search.mockResolvedValue([]);

    await useCase.execute('sofia');

    expect(candidates.search).toHaveBeenCalledWith({ search: 'sofia', limit: 20 });
  });

  it('permite buscar sin término (lista los primeros N)', async () => {
    candidates.search.mockResolvedValue([]);

    await useCase.execute(undefined);

    expect(candidates.search).toHaveBeenCalledWith({ search: undefined, limit: 20 });
  });

  it('devuelve los candidatos tal cual los da el repositorio', async () => {
    const result = [
      {
        id: 'student-1',
        fullName: 'Sofia Ramirez',
        documentType: 'TI' as const,
        documentNumber: '1002003',
        birthDate: '2015-03-01',
        gradeName: 'Quinto',
        sectionName: 'A',
      },
    ];
    candidates.search.mockResolvedValue(result);

    const output = await useCase.execute('sofia');

    expect(output).toEqual(result);
  });
});
