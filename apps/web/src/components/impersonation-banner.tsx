'use client';

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? 'http://localhost:3000';

export function ImpersonationBanner({ fullName, tenantId }: { fullName: string; tenantId: string }) {
  async function handleExit() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = `${PLATFORM_URL}/platform/tenants/${tenantId}`;
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>Estás viendo esto como {fullName}</span>
      <button type="button" onClick={handleExit} className="underline hover:no-underline">
        Salir
      </button>
    </div>
  );
}
