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
  PRIVATE_UPLOADS_DIR: Joi.string().default('./private-uploads'),
  API_PUBLIC_URL: Joi.string().uri().default('http://localhost:3001'),
  WEB_PUBLIC_URL: Joi.string().uri().default('http://localhost:3000'),
  // Orígenes permitidos por CORS, coma-separados. En multitenant por
  // subdominio, WEB_PUBLIC_URL solo cubre un origen — en producción con
  // varios subdominios reales, setear CORS_ORIGINS explícito con todos.
  CORS_ORIGINS: Joi.string().default(''),

  // Llave pública de Wompi (prefijo pub_test_/pub_prod_) — se usa tanto
  // para armar la URL de checkout como para consultar el estado de una
  // transacción (`Authorization: Bearer <public-key>`, no hace falta la
  // llave privada para ninguno de los dos). El ambiente (sandbox vs.
  // producción) se deriva de este mismo prefijo, ver WompiPaymentGateway.
  WOMPI_PUBLIC_KEY: Joi.string().default('pub_test_0000000000000000000000000000'),
  // Firma la integridad del checkout (monto/referencia/moneda) — sin esto
  // cualquiera podría armar una URL de pago con un monto distinto al real.
  WOMPI_INTEGRITY_SECRET: Joi.string().default('test_integrity_0000000000000000'),
  // Opcional en dev/test (verify-wompi-signature.ts deja pasar sin chequeo
  // si no está seteado) — pero requerido en producción: sin esto, el
  // webhook de pagos (`@Public()`) aceptaría cualquier POST sin firma como
  // notificación legítima de Wompi.
  WOMPI_EVENTS_SECRET: Joi.string()
    .allow('')
    .default('')
    .when('NODE_ENV', { is: 'production', then: Joi.string().required() }),
}).unknown(true);
