import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { TenantRepositoryPort } from '../../../platform/application/ports/tenant.repository.port';
import { TenantConnectionProvider } from '../../../../core/database/tenant-connection.provider';
import { EmailPort } from '../../../email/application/ports/email.port';
import { EmailTemplateService } from '../../../email/application/services/email-template.service';
import { TypeOrmEmailTemplateRepository } from '../../../email/infrastructure/repositories/typeorm-email-template.repository';
import { TypeOrmChargeRepository } from '../../infrastructure/repositories/typeorm-charge.repository';
import { TypeOrmPaymentRepository } from '../../infrastructure/repositories/typeorm-payment.repository';
import { TypeOrmPensionReminderLogRepository } from '../../infrastructure/repositories/typeorm-pension-reminder-log.repository';
import { TypeOrmEnrollmentRepository } from '../../../enrollment/infrastructure/repositories/typeorm-enrollment.repository';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { TypeOrmGuardianLinkRepository } from '../../../identity/infrastructure/repositories/typeorm-guardian-link.repository';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';

/**
 * Corre una vez al día (8am) y recorre TODOS los tenants — no hay contexto
 * de request HTTP acá, así que en vez de depender de `TENANT_DATA_SOURCE`
 * (Scope.REQUEST, requeriría simular un request) se construyen los
 * repositorios a mano por cada tenant, pasándoles la `DataSource` de su
 * schema directamente — mismo criterio que
 * `run-migrations-all-tenants.ts` para trabajo cross-tenant fuera de un
 * request real.
 */
@Injectable()
export class SendPensionReminderTask {
  private readonly logger = new Logger(SendPensionReminderTask.name);

  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    private readonly connections: TenantConnectionProvider,
    @Inject(EmailPort) private readonly emailPort: EmailPort,
  ) {}

  @Cron('0 8 * * *')
  async run(): Promise<void> {
    const allTenants = await this.tenants.findAll();
    const activeTenants = allTenants.filter((t) => t.status === 'active');

    for (const tenant of activeTenants) {
      try {
        await this.processTenant(tenant.schemaName);
      } catch (err) {
        this.logger.warn(
          `Recordatorio de pensión falló para el tenant "${tenant.schemaName}": ${(err as Error).message}`,
        );
      }
    }
  }

  private async processTenant(schemaName: string): Promise<void> {
    const dataSource: DataSource = await this.connections.getConnectionForSchema(schemaName);

    const charges = new TypeOrmChargeRepository(dataSource);
    const payments = new TypeOrmPaymentRepository(dataSource);
    const reminderLog = new TypeOrmPensionReminderLogRepository(dataSource);
    const enrollments = new TypeOrmEnrollmentRepository(dataSource);
    const users = new TypeOrmUserRepository(dataSource);
    const guardianAccess = new GuardianAccessService(new TypeOrmGuardianLinkRepository(dataSource));
    const templateService = new EmailTemplateService(new TypeOrmEmailTemplateRepository(dataSource));

    const today = new Date().toISOString().slice(0, 10);
    const pensionCharges = (await charges.findAll({ concept: 'pension' })).filter(
      (c) => !c.voidedAt && c.dueDate < today,
    );

    for (const charge of pensionCharges) {
      if (await reminderLog.existsByChargeId(charge.id)) continue;

      const chargePayments = await payments.findAll({ chargeId: charge.id });
      const paid = chargePayments.filter((p) => !p.voidedAt).reduce((sum, p) => sum + p.amount, 0);
      if (charge.computeBalance(paid) <= 0) continue;

      const enrollment = await enrollments.findById(charge.enrollmentId);
      if (!enrollment) continue;

      const student = await users.findById(enrollment.studentId);
      const guardianIds = await guardianAccess.getGuardianIds(enrollment.studentId);
      const guardians = await Promise.all(guardianIds.map((id) => users.findById(id)));
      const recipients = [student, ...guardians].filter((u): u is NonNullable<typeof u> => !!u);

      const variables = {
        estudiante: student?.fullName ?? 'el estudiante',
        fechaVencimiento: charge.dueDate,
        monto: charge.computeBalance(paid).toString(),
      };

      for (const recipient of recipients) {
        try {
          const { subject, html } = await templateService.render('recordatorio_pension', variables);
          await this.emailPort.send({ to: recipient.email, subject, html });
        } catch (err) {
          this.logger.warn(
            `No se pudo enviar el recordatorio de pensión a "${recipient.email}": ${(err as Error).message}`,
          );
        }
      }

      await reminderLog.save(new PensionReminderLog(randomUUID(), charge.id, new Date().toISOString()));
    }
  }
}
