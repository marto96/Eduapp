import * as Joi from 'joi';

/**
 * Falla rápido en el boot si falta una variable de entorno crítica, en vez
 * de fallar más tarde (y más confuso) en el primer request que la necesite.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),

  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  TENANT_HEADER_OVERRIDE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),

  PLATFORM_JWT_SECRET: Joi.string().min(16).required(),
  PLATFORM_JWT_EXPIRES_IN: Joi.string().default('8h'),

  UPLOADS_DIR: Joi.string().default('./uploads'),
  API_PUBLIC_URL: Joi.string().uri().default('http://localhost:3001'),
}).unknown(true);
