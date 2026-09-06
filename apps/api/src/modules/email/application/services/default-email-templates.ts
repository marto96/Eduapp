import { EmailTemplateType } from '../../domain/entities/email-template.entity';

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, { subject: string; body: string }> = {
  solicitud_recibida: {
    subject: 'Recibimos tu solicitud de admisión — {{trackingCode}}',
    body: '<p>Hola {{guardianName}},</p><p>Recibimos la solicitud de admisión de {{estudiante}} para {{grado}}. Tu código de seguimiento es <strong>{{trackingCode}}</strong>.</p><p>Podés completar el pago acá: <a href="{{checkoutUrl}}">{{checkoutUrl}}</a></p>',
  },
  pago_aprobado: {
    subject: 'Pago confirmado — solicitud {{trackingCode}}',
    body: '<p>Hola,</p><p>Confirmamos el pago de la solicitud de admisión ({{trackingCode}}).</p>',
  },
  pago_rechazado: {
    subject: 'No pudimos confirmar tu pago — solicitud {{trackingCode}}',
    body: '<p>Hola,</p><p>El pago de la solicitud ({{trackingCode}}) no pudo confirmarse. Podés intentar de nuevo desde el estado de tu trámite.</p>',
  },
  solicitud_aceptada: {
    subject: '¡Solicitud aceptada! — {{trackingCode}}',
    body: '<p>Hola,</p><p>La solicitud de admisión de {{estudiante}} fue aceptada. Nos pondremos en contacto para los siguientes pasos.</p>',
  },
  solicitud_rechazada: {
    subject: 'Novedades sobre tu solicitud — {{trackingCode}}',
    body: '<p>Hola,</p><p>La solicitud de admisión de {{estudiante}} no fue aceptada en esta oportunidad.</p>',
  },
  recordatorio_pension: {
    subject: 'Pensión pendiente de pago — {{estudiante}}',
    body: '<p>Te recordamos que la pensión de {{estudiante}} con vencimiento {{fechaVencimiento}} se encuentra pendiente de pago, por un monto de {{monto}}.</p>',
  },
};
