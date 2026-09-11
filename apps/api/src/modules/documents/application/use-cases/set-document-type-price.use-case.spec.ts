import { BadRequestException } from '@nestjs/common';
import { SetDocumentTypePriceUseCase } from './set-document-type-price.use-case';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';

describe('SetDocumentTypePriceUseCase', () => {
  const prices: jest.Mocked<DocumentTypePriceRepositoryPort> = {
    findAll: jest.fn(),
    findByType: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new SetDocumentTypePriceUseCase(prices);

  beforeEach(() => jest.clearAllMocks());

  it('crea el precio si el tipo no tenía uno todavía', async () => {
    prices.findByType.mockResolvedValue(null);
    const result = await useCase.execute('certificado_notas', 15000);
    expect(result.amount).toBe(15000);
    expect(prices.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'certificado_notas', amount: 15000 }));
  });

  it('actualiza el precio si el tipo ya tenía uno', async () => {
    prices.findByType.mockResolvedValue(new DocumentTypePrice('certificado_notas', 10000));
    const result = await useCase.execute('certificado_notas', 20000);
    expect(result.amount).toBe(20000);
  });

  it('rechaza un monto negativo', async () => {
    prices.findByType.mockResolvedValue(null);
    await expect(useCase.execute('certificado_notas', -1)).rejects.toThrow(BadRequestException);
  });
});
