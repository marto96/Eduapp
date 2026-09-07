import { EmailTemplateType } from '../../domain/entities/email-template.entity';

/**
 * Datos de ejemplo usados solo por el envío de prueba (`SendTestEmailUseCase`)
 * — no hay una solicitud/pago/cargo real detrás de un "Probar", así que se
 * completan los mismos placeholders que cada tipo usa en producción con
 * valores ficticios pero realistas.
 */
export const SAMPLE_EMAIL_VARIABLES: Record<EmailTemplateType, Record<string, string>> = {
  solicitud_recibida: {
    guardianName: 'María Pérez',
    estudiante: 'Juan Pérez',
    grado: 'Sexto',
    trackingCode: 'SOL-ABC123',
    checkoutUrl: 'https://checkout.wompi.co/p/?reference=ejemplo',
  },
  pago_aprobado: { trackingCode: 'SOL-ABC123' },
  pago_rechazado: { trackingCode: 'SOL-ABC123' },
  solicitud_aceptada: { trackingCode: 'SOL-ABC123', estudiante: 'Juan Pérez' },
  solicitud_rechazada: { trackingCode: 'SOL-ABC123', estudiante: 'Juan Pérez' },
  recordatorio_pension: { estudiante: 'Juan Pérez', fechaVencimiento: '2026-09-01', monto: '150000' },
};
