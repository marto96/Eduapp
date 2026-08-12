import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { envValidationSchema } from './core/config/env.validation';
import { platformDataSourceOptions } from './core/database/platform.datasource';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/cache/redis.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { StorageModule } from './core/storage/storage.module';
import { TenantResolutionMiddleware } from './core/tenant/tenant-resolution.middleware';
import { PaymentWebhookTenantMiddleware } from './modules/finance/interface/middleware/payment-webhook-tenant.middleware';
import { PlatformModule } from './modules/platform/platform.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AcademicModule } from './modules/academic/academic.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GradingModule } from './modules/grading/grading.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HrModule } from './modules/hr/hr.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { SurveyModule } from './modules/survey/survey.module';
import { LibraryModule } from './modules/library/library.module';
import { ReportsModule } from './modules/reports/reports.module';

// A medida que se implementen los demás módulos (reports, etc.) se
// importan acá siguiendo el mismo patrón que AcademicModule.

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    // Única conexión "fija" del proceso: schema `public` (registro de tenants).
    // Las conexiones de tenant se abren dinámicamente, ver core/database/DatabaseModule.
    TypeOrmModule.forRoot({ ...platformDataSourceOptions, name: 'platform' }),
    // Sirve los archivos públicos (hoy solo logos institucionales, ver
    // LocalDiskFileStorage) — los privados (documentos, adjuntos de
    // mensajes) van a PRIVATE_UPLOADS_DIR, fuera de esta ruta estática. Lee
    // `process.env.UPLOADS_DIR` directo (no vía ConfigService, todavía no
    // existe acá) — funciona porque `platform.datasource.ts` (importado
    // arriba) hace `import 'dotenv/config'` como side-effect, cargando el
    // .env antes de que se evalúe el resto de este archivo.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    TenantModule,
    StorageModule,
    PlatformModule,
    IdentityModule,
    AcademicModule,
    EnrollmentModule,
    AttendanceModule,
    GradingModule,
    ScheduleModule,
    FinanceModule,
    HrModule,
    DocumentsModule,
    CommunicationModule,
    SurveyModule,
    LibraryModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Resuelve el tenant (por subdominio/host) antes de cualquier controlador,
    // salvo en /platform/*: gestión de instituciones vive en el schema
    // `public` y no depende de que exista (o se pueda resolver) un tenant.
    // También se excluye /uploads/*: una petición de imagen (<img src="...">)
    // llega con el host del propio servidor API, no con el subdominio de
    // ningún tenant, y este middleware rechazaría el request con 404 si no
    // se excluye. Mismo motivo para el webhook de pagos: lo llama
    // MercadoPago directo, no nuestro frontend — resuelve tenant aparte,
    // ver PaymentWebhookTenantMiddleware.
    consumer
      .apply(TenantResolutionMiddleware)
      .exclude(
        { path: 'platform/(.*)', method: RequestMethod.ALL },
        { path: 'uploads/(.*)', method: RequestMethod.ALL },
        { path: 'finance/payments/webhook', method: RequestMethod.POST },
      )
      .forRoutes('*');

    consumer
      .apply(PaymentWebhookTenantMiddleware)
      .forRoutes({ path: 'finance/payments/webhook', method: RequestMethod.POST });
  }
}
