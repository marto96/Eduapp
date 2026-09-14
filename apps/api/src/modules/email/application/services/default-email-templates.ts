import { EmailTemplateType } from '../../domain/entities/email-template.entity';

// Piezas compartidas del mismo layout que `solicitud_recibida` (tablas
// anidadas, no flex/grid, a propósito: es lo único que renderiza de forma
// confiable en clientes de correo reales — Outlook de escritorio usa el
// motor de Word). Se dejan como funciones acá para los otros 5 templates
// en vez de tocar el body de `solicitud_recibida` (ya verificado en
// producción tal cual está).
const emailWrapOpen =
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EDEA;"><tr><td align="center" style="padding:32px 16px;">' +
  '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FEFCFB;border:1px solid #E4E0DD;border-radius:12px;">';
const emailWrapClose = '</table></td></tr></table>';
const emailHeader = (subtitle: string) =>
  '<tr><td style="padding:24px 32px;border-bottom:1px solid #E4E0DD;">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
  '<td style="padding-right:12px;vertical-align:middle;"><img src="{{institutionLogoUrl}}" width="40" height="40" alt="{{institutionName}}" style="border-radius:8px;display:block;"></td>' +
  '<td style="vertical-align:middle;"><span style="font-size:15px;font-weight:600;color:#24201E;">{{institutionName}}</span><br>' +
  `<span style="font-size:12px;color:#7F746C;">${subtitle}</span></td>` +
  '</tr></table></td></tr>';
const emailFooter =
  '<tr><td style="padding:20px 32px;border-top:1px solid #E4E0DD;">' +
  '<p style="margin:0;font-size:12px;color:#7F746C;line-height:1.5;">Este es un mensaje automático de {{institutionName}}. Si tenés dudas, respondé este correo.</p>' +
  '</td></tr>';
const emailHighlightBox = (label: string, value: string) =>
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EDEA;border-radius:8px;"><tr><td style="padding:16px 20px;">' +
  `<span style="display:block;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#7F746C;margin-bottom:4px;">${label}</span>` +
  `<span style="font-size:20px;font-weight:700;color:#E25E36;">${value}</span>` +
  '</td></tr></table>';
const emailParagraph = (html: string, marginBottom = 16) =>
  `<p style="margin:0 0 ${marginBottom}px;font-size:15px;color:#24201E;line-height:1.6;">${html}</p>`;
const emailBody = (subtitle: string, contentHtml: string) =>
  emailWrapOpen + emailHeader(subtitle) + `<tr><td style="padding:32px;">${contentHtml}</td></tr>` + emailFooter + emailWrapClose;

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, { subject: string; body: string }> = {
  solicitud_recibida: {
    subject: 'Recibimos tu solicitud de admisión — {{trackingCode}}',
    // Layout con tablas (no flex/grid) a propósito: es lo único que
    // renderiza de forma confiable en clientes de correo reales
    // (Outlook de escritorio usa el motor de Word, sin soporte real de
    // flexbox). Paleta y tipografía calcadas de la app (paleta
    // "Terracota", ver globals.css). Institución vía {{institutionName}}/
    // {{institutionLogoUrl}} — si el tenant no cargó logo, el <img> queda
    // con src vacío (limitación conocida: el motor de plantillas es un
    // reemplazo de texto simple, sin condicionales para omitirlo).
    body:
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EDEA;"><tr><td align="center" style="padding:32px 16px;">' +
      '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FEFCFB;border:1px solid #E4E0DD;border-radius:12px;">' +
      '<tr><td style="padding:24px 32px;border-bottom:1px solid #E4E0DD;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="padding-right:12px;vertical-align:middle;"><img src="{{institutionLogoUrl}}" width="40" height="40" alt="{{institutionName}}" style="border-radius:8px;display:block;"></td>' +
      '<td style="vertical-align:middle;"><span style="font-size:15px;font-weight:600;color:#24201E;">{{institutionName}}</span><br>' +
      '<span style="font-size:12px;color:#7F746C;">Admisiones</span></td>' +
      '</tr></table></td></tr>' +
      '<tr><td style="padding:32px;">' +
      '<p style="margin:0 0 16px;font-size:15px;color:#24201E;line-height:1.6;">Hola {{guardianName}},</p>' +
      '<p style="margin:0 0 24px;font-size:15px;color:#24201E;line-height:1.6;">Recibimos la solicitud de admisión de <strong>{{estudiante}}</strong> para <strong>{{grado}}</strong>. Te avisamos apenas quede confirmada.</p>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EDEA;border-radius:8px;margin-bottom:28px;"><tr><td style="padding:16px 20px;">' +
      '<span style="display:block;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#7F746C;margin-bottom:4px;">Código de seguimiento</span>' +
      '<span style="font-size:20px;font-weight:700;color:#E25E36;">{{trackingCode}}</span>' +
      '</td></tr></table>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#E25E36;border-radius:8px;">' +
      '<a href="{{checkoutUrl}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FEFCFB;text-decoration:none;">Completar el pago</a>' +
      '</td></tr></table>' +
      '</td></tr>' +
      '<tr><td style="padding:20px 32px;border-top:1px solid #E4E0DD;">' +
      '<p style="margin:0;font-size:12px;color:#7F746C;line-height:1.5;">Este es un mensaje automático de {{institutionName}}. Si tenés dudas, respondé este correo.</p>' +
      '</td></tr>' +
      '</table>' +
      '</td></tr></table>',
  },
  pago_aprobado: {
    subject: 'Pago confirmado — solicitud {{trackingCode}}',
    body: emailBody(
      'Pagos',
      emailParagraph('Hola,') +
        emailParagraph('Confirmamos el pago de tu solicitud de admisión.', 24) +
        emailHighlightBox('Código de seguimiento', '{{trackingCode}}'),
    ),
  },
  pago_rechazado: {
    subject: 'No pudimos confirmar tu pago — solicitud {{trackingCode}}',
    body: emailBody(
      'Pagos',
      emailParagraph('Hola,') +
        emailParagraph(
          'No pudimos confirmar el pago de tu solicitud de admisión. Podés intentar de nuevo desde el estado de tu trámite.',
          24,
        ) +
        emailHighlightBox('Código de seguimiento', '{{trackingCode}}'),
    ),
  },
  solicitud_aceptada: {
    subject: '¡Solicitud aceptada! — {{trackingCode}}',
    body: emailBody(
      'Admisiones',
      emailParagraph('Hola,') +
        emailParagraph(
          '¡Buenas noticias! La solicitud de admisión de <strong>{{estudiante}}</strong> fue aceptada. Nos pondremos en contacto para los siguientes pasos.',
          24,
        ) +
        emailHighlightBox('Código de seguimiento', '{{trackingCode}}'),
    ),
  },
  solicitud_rechazada: {
    subject: 'Novedades sobre tu solicitud — {{trackingCode}}',
    body: emailBody(
      'Admisiones',
      emailParagraph('Hola,') +
        emailParagraph(
          'Te contamos que la solicitud de admisión de <strong>{{estudiante}}</strong> no fue aceptada en esta oportunidad.',
          24,
        ) +
        emailHighlightBox('Código de seguimiento', '{{trackingCode}}'),
    ),
  },
  recordatorio_pension: {
    subject: 'Pensión pendiente de pago — {{estudiante}}',
    body: emailBody(
      'Finanzas',
      emailParagraph('Hola,') +
        emailParagraph(
          'Te recordamos que la pensión de <strong>{{estudiante}}</strong> con vencimiento <strong>{{fechaVencimiento}}</strong> se encuentra pendiente de pago.',
          24,
        ) +
        emailHighlightBox('Monto pendiente', '{{monto}}'),
    ),
  },
};
