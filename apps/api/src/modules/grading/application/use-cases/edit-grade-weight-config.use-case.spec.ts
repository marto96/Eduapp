import { BadRequestException } from '@nestjs/common';
import { EditGradeWeightConfigUseCase } from './edit-grade-weight-config.use-case';
import { GradeWeightConfigService } from '../services/grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

describe('EditGradeWeightConfigUseCase', () => {
  const configs: jest.Mocked<GradeWeightConfigRepositoryPort> = {
    findFirst: jest.fn(),
    save: jest.fn(),
  };
  const configService = new GradeWeightConfigService(configs);
  const useCase = new EditGradeWeightConfigUseCase(configService);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si los pesos no suman 100%', async () => {
    configs.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));

    await expect(
      useCase.execute({ actividadWeight: 0.5, evaluacionBimestralWeight: 0.3, disciplinaWeight: 0.3 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('actualiza los pesos cuando suman 100%', async () => {
    configs.findFirst.mockResolvedValue(new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1));

    const result = await useCase.execute({
      actividadWeight: 0.6,
      evaluacionBimestralWeight: 0.3,
      disciplinaWeight: 0.1,
    });

    expect(result.actividadWeight).toBe(0.6);
    expect(configs.save).toHaveBeenCalledTimes(1);
  });
});
