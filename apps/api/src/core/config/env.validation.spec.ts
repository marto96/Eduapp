import { envValidationSchema } from './env.validation';

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a-secret-at-least-16-chars',
    JWT_REFRESH_SECRET: 'another-secret-16-chars',
    PLATFORM_JWT_SECRET: 'platform-secret-16-chars',
    ...overrides,
  };
}

describe('envValidationSchema — WOMPI_EVENTS_SECRET', () => {
  it('falla en producción si no está configurado', () => {
    const { error } = envValidationSchema.validate(baseEnv({ NODE_ENV: 'production' }));

    expect(error?.message).toMatch(/WOMPI_EVENTS_SECRET/);
  });

  it('pasa en producción si está configurado', () => {
    const { error } = envValidationSchema.validate(
      baseEnv({ NODE_ENV: 'production', WOMPI_EVENTS_SECRET: 'real-secret' }),
    );

    expect(error).toBeUndefined();
  });

  it('no lo exige en development', () => {
    const { error } = envValidationSchema.validate(baseEnv({ NODE_ENV: 'development' }));

    expect(error).toBeUndefined();
  });

  it('no lo exige en test', () => {
    const { error } = envValidationSchema.validate(baseEnv({ NODE_ENV: 'test' }));

    expect(error).toBeUndefined();
  });
});
