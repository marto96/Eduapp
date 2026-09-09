import { GoneException } from '@nestjs/common';
import type Redis from 'ioredis';
import { ConsumeImpersonationUseCase } from './consume-impersonation.use-case';

describe('ConsumeImpersonationUseCase', () => {
  const redis = { get: jest.fn(), del: jest.fn() };
  const useCase = new ConsumeImpersonationUseCase(redis as unknown as Redis);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza un código inexistente o vencido', async () => {
    redis.get.mockResolvedValue(null);

    await expect(useCase.execute('code-x')).rejects.toThrow(GoneException);
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('devuelve el access token guardado y borra el código (uso único)', async () => {
    redis.get.mockResolvedValue('signed.jwt.token');

    const result = await useCase.execute('code-1');

    expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    expect(redis.get).toHaveBeenCalledWith('impersonation:handoff:code-1');
    expect(redis.del).toHaveBeenCalledWith('impersonation:handoff:code-1');
  });
});
