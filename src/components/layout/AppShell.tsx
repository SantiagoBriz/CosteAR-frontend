import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Building2, Bell, LineChart, LogOut, User, ClipboardCheck, History, Zap, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { usePendingCount } from '@/features/validaciones/validaciones-hooks';

const NAV = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/companies', label: 'Clientes', icon: Building2 },
  { to: '/validaciones', label: 'Validaciones', icon: ClipboardCheck, badge: true },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/macro', label: 'Variables macro', icon: LineChart },
  { to: '/propagacion', label: 'Propagación', icon: Zap },
  { to: '/automatizacion', label: 'Automatización', icon: Bot },
  { to: '/alerts', label: 'Alertas', icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { location } = useRouterState();

  return (
    <div className="flex min-h-screen bg-surface-alt">
      {/* Sidebar — el granate vive en la navegación, no en el contenido. */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-line bg-granate-deep text-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
          <div className="flex size-7 items-center justify-center rounded-md bg-action text-sm font-bold">
            C
          </div>
          <span className="text-lg font-bold tracking-tight">CosteAR</span>
        </div>

        <NavItems currentPath={location.pathname} />

        <div className="border-t border-white/10 p-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <User className="size-[18px]" />
            <span className="truncate">{user?.name ?? 'Mi perfil'}</span>
          </Link>
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-[18px]" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="ml-60 flex-1">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

function NavItems({ currentPath }: { currentPath: string }) {
  const { data: pendingCount = 0 } = usePendingCount();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ to, label, icon: Icon, ...rest }) => {
        const active = currentPath.startsWith(to);
        const showBadge = 'badge' in rest && rest.badge && pendingCount > 0;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-action text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="size-[18px]" />
            <span className="flex-1">{label}</span>
            {showBadge && (
              <span className="flex size-5 items-center justify-center rounded-full bg-action text-[11px] font-bold text-white">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </header>
  );
}
