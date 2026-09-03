import { GradeWeightConfigService } from './grade-weight-config.service';
import { GradeWeightConfigRepositoryPort } from '../ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

describe('GradeWeightConfigService', () => {
  const configs: jest.Mocked<GradeWeightConfigRepositoryPort> = {
    findFirst: jest.fn(),
    save: jest.fn(),
  };

  const service = new GradeWeightConfigService(configs);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve la config existente si ya hay una', async () => {
    const existing = new GradeWeightConfig('cfg-1', 0.7, 0.2, 0.1);
    configs.findFirst.mockResolvedValue(existing);

    const result = await service.getOrCreateDefault();

    expect(result).toBe(existing);
    expect(configs.save).not.toHaveBeenCalled();
  });

  it('crea una con los pesos default 65/25/10 si no hay ninguna', async () => {
    configs.findFirst.mockResolvedValue(null);

    const result = await service.getOrCreateDefault();

    expect(result.actividadWeight).toBe(0.65);
    expect(result.evaluacionBimestralWeight).toBe(0.25);
    expect(result.disciplinaWeight).toBe(0.1);
    expect(configs.save).toHaveBeenCalledTimes(1);
  });
});
