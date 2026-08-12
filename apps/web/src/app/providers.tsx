'use client';

import { useEffect, useState } from 'react';
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Todos los hooks de `features/` ya lanzan `Error` con un mensaje en
 * español legible (ej. "No se pudo crear el cargo") — este `onError`
 * global le da feedback visible a las ~40 queries/mutaciones existentes
 * sin tener que tocar cada hook uno por uno.
 */
function showErrorToast(error: unknown) {
  toast.error(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
}

/**
 * Redirige a /login apenas el middleware (ver `middleware.ts`) confirma que
 * la sesión murió de verdad (refresh token vencido/revocado) — no en
 * cualquier 401/403 de una ruta BFF, que puede significar simplemente "no
 * tenés permiso para esto" (ver `serverApiFetch`, mezcla ambos códigos sin
 * distinguir motivo). El middleware marca ese caso puntual con el header
 * `x-session-expired`, generado antes de que la request llegue a ningún
 * route handler — no hay ambigüedad posible.
 *
 * Parchea `window.fetch` una sola vez en vez de tocar los ~40 hooks de
 * `features/` que ya llaman `fetch()` directo — así cubre cualquier
 * request, incluido el polling de no-leídos en background, sin que el
 * usuario tenga que interactuar con la página para notarlo.
 */
function useRedirectOnSessionExpired() {
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.headers.get('x-session-expired') && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: showErrorToast }),
        mutationCache: new MutationCache({ onError: showErrorToast }),
      }),
  );
  useRedirectOnSessionExpired();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
