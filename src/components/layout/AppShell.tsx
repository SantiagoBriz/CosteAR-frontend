import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Building2, Bell, LogOut, User, ClipboardCheck, Zap, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { usePendingCount } from '@/features/validaciones/validaciones-hooks';

const NAV = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/companies', label: 'Clientes', icon: Building2 },
  { to: '/validaciones', label: 'Validaciones', icon: ClipboardCheck, badge: true },
  { to: '/alerts', label: 'Alertas', icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { location } = useRouterState();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <div className="flex min-h-screen bg-surface-alt">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 flex flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 transition-all duration-200 z-30",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-zinc-800 px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-granate text-sm font-bold text-white">
            C
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white animate-rise">CosteAR</span>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className="ml-auto flex size-8 items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="size-4.5" />
          </button>
        </div>

        <NavItems currentPath={location.pathname} collapsed={collapsed} />

        <div className="border-t border-zinc-800 p-2 space-y-1">
          {/* Switch to Operator Portal */}
          {!collapsed && (
            <Link
              to="/portal"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold text-action-soft hover:bg-zinc-900 transition-colors"
            >
              <Zap className="size-[16px] shrink-0" />
              <span>Portal del Operador</span>
            </Link>
          )}
          {collapsed && (
            <Link
              to="/portal"
              title="Portal del Operador"
              className="flex size-10 items-center justify-center rounded-md text-action-soft hover:bg-zinc-900 transition-colors mx-auto"
            >
              <Zap className="size-[18px]" />
            </Link>
          )}

          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100",
              collapsed && "justify-center"
            )}
            title="Mi perfil"
          >
            <User className="size-[18px] shrink-0" />
            {!collapsed && <span className="truncate text-[13px]">{user?.name ?? 'Mi perfil'}</span>}
          </Link>
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100",
              collapsed && "justify-center"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="size-[18px] shrink-0" />
            {!collapsed && <span className="text-[13px]">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className={cn("flex-1 transition-all duration-200", collapsed ? "ml-16" : "ml-60")}>
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

function NavItems({ currentPath, collapsed }: { currentPath: string; collapsed: boolean }) {
  const { data: pendingCount = 0 } = usePendingCount();

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {NAV.map(({ to, label, icon: Icon, ...rest }) => {
        const active = currentPath.startsWith(to);
        const showBadge = 'badge' in rest && rest.badge && pendingCount > 0;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative',
              active
                ? 'bg-granate text-white'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
              collapsed && 'justify-center'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-[18px] shrink-0" />
            {!collapsed && <span className="flex-1 text-[13px]">{label}</span>}
            {showBadge && (
              <span className={cn(
                "flex items-center justify-center rounded-full bg-action text-[10px] font-bold text-white shrink-0",
                collapsed ? "absolute -top-1 -right-1 size-4.5 border border-zinc-950" : "size-5"
              )}>
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
