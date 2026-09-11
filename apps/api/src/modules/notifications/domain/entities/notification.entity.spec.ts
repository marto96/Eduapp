import { Notification } from './notification.entity';

describe('Notification', () => {
  it('markRead setea readAt', () => {
    const n = new Notification('n1', 'user-1', 'x', 'Título', 'Cuerpo', '/x', '2026-09-11T00:00:00.000Z');
    expect(n.readAt).toBeNull();
    n.markRead();
    expect(n.readAt).not.toBeNull();
  });

  it('markRead es idempotente — no pisa un readAt ya seteado', () => {
    const n = new Notification('n1', 'user-1', 'x', 'Título', 'Cuerpo', '/x', '2026-09-11T00:00:00.000Z');
    n.markRead();
    const firstReadAt = n.readAt;
    n.markRead();
    expect(n.readAt).toBe(firstReadAt);
  });
});
