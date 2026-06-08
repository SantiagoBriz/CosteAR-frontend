import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import axios from 'axios';
import { router } from './router';
import { API_BASE } from './lib/api';
import { useAuthStore, type AuthUser } from './stores/auth-store';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

/**
 * Bootstrap de sesión: al cargar la app intenta refrescar el access token
 * usando la cookie httpOnly. Si funciona, el usuario sigue logueado sin haber
 * guardado nada en localStorage.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setAuth, setInitialized, initializing } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        const refresh = await axios.post<{ data: { accessToken: string } }>(
          `${API_BASE}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const token = refresh.data.data.accessToken;
        const me = await axios.get<{ data: AuthUser }>(`${API_BASE}/api/v1/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setAuth(token, me.data.data);
      } catch {
        // Sin sesión válida: seguimos como anónimos.
      } finally {
        setInitialized();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt">
        <div className="size-6 animate-spin rounded-full border-2 border-granate border-t-transparent" />
      </div>
    );
  }
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
