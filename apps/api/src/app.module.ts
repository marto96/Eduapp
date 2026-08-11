import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './core/config/env.validation';
import { platformDataSourceOptions } from './core/database/platform.datasource';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/cache/redis.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { TenantResolutionMiddleware } from './core/tenant/tenant-resolution.middleware';
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

// A medida que se implementen los demás módulos (library, communication,
// etc.) se importan acá siguiendo el mismo patrón que AcademicModule.

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    // Única conexión "fija" del proceso: schema `public` (registro de tenants).
    // Las conexiones de tenant se abren dinámicamente, ver core/database/DatabaseModule.
    TypeOrmModule.forRoot({ ...platformDataSourceOptions, name: 'platform' }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    TenantModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Resuelve el tenant (por subdominio/host) antes de cualquier controlador,
    // salvo en /platform/*: gestión de instituciones vive en el schema
    // `public` y no depende de que exista (o se pueda resolver) un tenant.
    consumer
      .apply(TenantResolutionMiddleware)
      .exclude({ path: 'platform/(.*)', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
