import { buildVirtualRoomName } from './virtual-room-name';

describe('buildVirtualRoomName', () => {
  it('combina tenantId y scheduleId con el prefijo skolaria', () => {
    expect(buildVirtualRoomName('tenant-1', 'sched-1')).toBe('skolaria-tenant-1-sched-1');
  });

  it('es determinístico: el mismo input siempre da el mismo nombre', () => {
    const a = buildVirtualRoomName('tenant-1', 'sched-1');
    const b = buildVirtualRoomName('tenant-1', 'sched-1');
    expect(a).toBe(b);
  });

  it('tenants distintos con el mismo scheduleId no colisionan', () => {
    const a = buildVirtualRoomName('tenant-1', 'sched-1');
    const b = buildVirtualRoomName('tenant-2', 'sched-1');
    expect(a).not.toBe(b);
  });
});
