import { DocumentRequest } from './document-request.entity';

describe('DocumentRequest', () => {
  const build = (overrides: Partial<{ deliveryMethod: 'digital' | 'fisico'; status: DocumentRequest['status'] }> = {}) =>
    new DocumentRequest(
      'req-1',
      'enrollment-1',
      'certificado_notas',
      overrides.deliveryMethod ?? 'digital',
      null,
      'user-1',
      '2026-09-11T10:00:00.000Z',
      overrides.status ?? 'pendiente_pago',
      'charge-1',
    );

  it('markReady deja la solicitud en "lista" si la entrega es digital', () => {
    const req = build({ deliveryMethod: 'digital' });
    req.markReady('doc-1');
    expect(req.status).toBe('lista');
    expect(req.issuedDocumentId).toBe('doc-1');
  });

  it('markReady deja la solicitud en "lista_para_imprimir" si la entrega es física', () => {
    const req = build({ deliveryMethod: 'fisico' });
    req.markReady('doc-1');
    expect(req.status).toBe('lista_para_imprimir');
  });

  it('markDelivered marca entregada una solicitud lista_para_imprimir', () => {
    const req = build({ deliveryMethod: 'fisico', status: 'lista_para_imprimir' });
    req.markDelivered('staff-1');
    expect(req.status).toBe('entregada');
    expect(req.resolvedBy).toBe('staff-1');
    expect(req.resolvedAt).not.toBeNull();
  });

  it('markDelivered lanza error si la solicitud no está lista_para_imprimir', () => {
    const req = build({ deliveryMethod: 'fisico', status: 'pendiente_pago' });
    expect(() => req.markDelivered('staff-1')).toThrow(
      'Solo se puede entregar una solicitud que está lista para imprimir',
    );
  });

  it('reject rechaza una solicitud pendiente_pago', () => {
    const req = build({ status: 'pendiente_pago' });
    req.reject('staff-1', 'Documento ya emitido antes');
    expect(req.status).toBe('rechazada');
    expect(req.rejectionReason).toBe('Documento ya emitido antes');
  });

  it('reject lanza error si la solicitud ya no está pendiente_pago', () => {
    const req = build({ status: 'lista' });
    expect(() => req.reject('staff-1', 'motivo')).toThrow(
      'Solo se puede rechazar una solicitud que todavía no fue pagada',
    );
  });
});
