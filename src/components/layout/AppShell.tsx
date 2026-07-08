import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Building2, Bell, LogOut, User, ClipboardCheck, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { usePendingCount } from '@/features/validaciones/validaciones-hooks';

const NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/companies', label: 'Clientes', icon: Building2 },
  { to: '/validaciones', label: 'Validaciones', icon: ClipboardCheck, badge: true },
  { to: '/alerts', label: 'Alertas', icon: Bell },
] as const;

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
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
        {/* Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute top-5 -right-3 flex size-6 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all z-40 focus:outline-none"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>

        <div className={cn("flex h-16 items-center border-b border-zinc-800 px-4 transition-all duration-200", collapsed && "justify-center px-0")}>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-granate text-sm font-bold text-white">
              C
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-white animate-rise">CosteAR</span>
            )}
          </div>
        </div>

        <NavItems currentPath={location.pathname} collapsed={collapsed} />

        <div className="border-t border-zinc-800 p-2 space-y-1">
          {/* Switch to Operator Portal */}
          {!collapsed && (
            <Link
              to="/portal"
              className="flex items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold text-action-soft hover:bg-zinc-900 transition-colors"
            >
              <Zap className="size-[16px] shrink-0" />
              <span>Portal del Operador</span>
            </Link>
          )}
          {collapsed && (
            <Link
              to="/portal"
              title="Portal del Operador"
              className="flex size-10 items-center justify-center rounded-full text-action-soft hover:bg-zinc-900 transition-colors mx-auto"
            >
              <Zap className="size-[18px]" />
            </Link>
          )}

          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100",
              collapsed && "justify-center"
            )}
            title="Mi perfil"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-[22px] shrink-0 rounded-full object-cover" />
            ) : (
              <User className="size-[18px] shrink-0" />
            )}
            {!collapsed && <span className="truncate text-[13px]">{user?.name ?? 'Mi perfil'}</span>}
          </Link>
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
            className={cn(
              "flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100",
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
        <div className={cn('mx-auto px-8 py-8', wide ? 'max-w-[90rem]' : 'max-w-6xl')}>{children}</div>
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
              'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all relative',
              active
                ? 'bg-granate text-white shadow-md shadow-granate/10'
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
