import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // El logo institucional se sirve desde /uploads (mismo proceso, puerto
  // distinto al frontend en dev) — sin `cross-origin` explícito, el CORP
  // por defecto de helmet bloquearía esa carga cross-origin de imagen.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // `ConfigModule` valida process.env con Joi y reescribe el default (''
  // para CORS_ORIGINS) — por eso no alcanza con `?? fallback`, el string
  // vacío no es `undefined`: hay que chequear el array resultante vacío.
  const explicitOrigins =
    process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  const allowedOrigins =
    explicitOrigins.length > 0
      ? explicitOrigins
      : [process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000', 'http://localhost:3000'];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
