import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Building2, Bell, LogOut, ClipboardCheck, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { usePendingCount } from '@/features/validaciones/validaciones-hooks';
import { useAlerts } from '@/features/alerts/alert-hooks';
import { CosteARLogo } from '@/components/layout/CosteARLogo';

const NAV = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/companies', label: 'Clientes', icon: Building2 },
  { to: '/validaciones', label: 'Validaciones', icon: ClipboardCheck, badge: true },
  { to: '/alerts', label: 'Alertas', icon: Bell },
] as const;

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { location } = useRouterState();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: alerts = [] } = useAlerts();
  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="flex min-h-screen bg-surface-alt font-outfit overflow-x-hidden relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .font-syne {
          font-family: 'Syne', sans-serif;
        }
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
        .font-mono-jb {
          font-family: 'JetBrains Mono', monospace;
        }

        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.05); }
        }
        .animate-orb-1 {
          animation: orbFloat1 15s ease-in-out infinite;
        }
        .animate-orb-2 {
          animation: orbFloat2 18s ease-in-out infinite;
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-granate-tenue opacity-55 blur-[130px] animate-orb-1 z-0" />
      <div className="pointer-events-none absolute right-[-5%] bottom-[-5%] h-[550px] w-[550px] rounded-full bg-action-soft/5 opacity-40 blur-[120px] animate-orb-2 z-0" />

      {/* DETACHED FLOATING VERTICAL SIDEBAR DOCK (Matches Tablet design screenshot) */}
      <aside className="fixed top-4 bottom-4 left-4 w-20 bg-gradient-to-b from-[#200408] via-[#140205] to-[#0e0002] rounded-[30px] border border-white/5 flex flex-col items-center py-6 justify-between shadow-[0_20px_50px_rgba(74,21,27,0.06)] z-30">
        
        {/* Top: Logo in clean white container */}
        <div className="flex flex-col items-center">
          <div className="flex size-12 items-center justify-center rounded-[18px] bg-white text-granate shadow-md shadow-granate/10 hover:scale-105 transition-transform duration-300">
            <CosteARLogo className="h-6.5 w-auto text-granate" />
          </div>
        </div>

        {/* Center: Main Nav Icons */}
        <nav className="flex flex-col gap-4">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => {
            const active = location.pathname.startsWith(to);
            const showBadge = 'badge' in rest && rest.badge && pendingCount > 0;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex size-12 items-center justify-center rounded-[18px] transition-all duration-300 relative group',
                  active
                    ? 'bg-white text-granate shadow-lg'
                    : 'text-zinc-450 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="size-[20px] shrink-0" />
                
                {/* Clean hover tooltip */}
                <span className="absolute left-16 bg-[#140205] border border-white/5 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                  {label}
                </span>

                {showBadge && (
                  <span className={cn(
                    "absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-action text-[9.5px] font-extrabold text-white border-2",
                    active ? "border-white" : "border-[#140205]"
                  )}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Portal, Profile, Logout */}
        <div className="flex flex-col items-center gap-4">
          {/* Operator Portal Link */}
          <Link
            to="/portal"
            className="flex size-12 items-center justify-center rounded-[18px] text-action-soft hover:text-white hover:bg-white/5 transition-all duration-200 relative group"
          >
            <Zap className="size-[20px]" />
            <span className="absolute left-16 bg-[#140205] border border-white/5 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
              Portal de Operador
            </span>
          </Link>

          {/* Profile link */}
          <Link
            to="/profile"
            className={cn(
              "flex size-12 items-center justify-center rounded-[18px] transition-all duration-200 relative group",
              location.pathname.startsWith('/profile') ? 'bg-white text-granate shadow-lg' : 'text-zinc-450 hover:text-white hover:bg-white/5'
            )}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover border border-white/10" />
            ) : (
              <span className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-bold border",
                location.pathname.startsWith('/profile') ? 'bg-granate-tenue text-granate border-granate/10' : 'bg-white/5 text-zinc-350 border-white/10'
              )}>
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
            <span className="absolute left-16 bg-[#140205] border border-white/5 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
              Mi Perfil
            </span>
          </Link>

          {/* Logout */}
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
            className="flex size-12 items-center justify-center rounded-[18px] text-zinc-400 hover:text-danger hover:bg-red-950/20 transition-all duration-200 cursor-pointer relative group"
          >
            <LogOut className="size-[20px]" />
            <span className="absolute left-16 bg-[#140205] border border-white/5 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Main Container (Shifted right by pl-28 to clear the floating sidebar) */}
      <div className="flex-1 flex flex-col pl-28 relative z-10 min-h-screen">
        
        {/* PERSISTENT TOP GLOBAL HEADER STRIP (Matches Tablet design top bar) */}
        <header className="flex h-16 items-center justify-between border-b border-line/40 px-8">
          {/* Left side: Context badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-granate-deep/70 bg-granate-tenue/60 px-3 py-1 rounded-full border border-granate/10">
              Panel de Control
            </span>
          </div>

          {/* Right side: Alerts and User details */}
          <div className="flex items-center gap-4">
            {/* Alerts Indicator */}
            <Link
              to="/alerts"
              className="relative p-2 rounded-full border border-line bg-surface/40 text-ink-soft hover:text-granate hover:bg-surface transition-all shadow-sm"
              title="Alertas"
            >
              <Bell className="size-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-action animate-pulse" />
              )}
            </Link>

            {/* Profile Detail Card */}
            <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface/50 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-6.5 shrink-0 rounded-full object-cover border border-line" />
              ) : (
                <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-granate-tenue text-[10.5px] font-extrabold text-granate border border-granate/10">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              )}
              <div className="text-left leading-none pr-1">
                <p className="text-[11.5px] font-bold text-ink">{user?.name ?? 'Usuario'}</p>
                <p className="text-[8.5px] text-ink-soft mt-0.5 font-bold uppercase tracking-wider">Costista</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1">
          <div className={cn('mx-auto px-8 py-8', wide ? 'max-w-[90rem]' : 'max-w-6xl')}>{children}</div>
        </main>

        {/* Cohesive Footer */}
        <footer className="border-t border-line/40 py-6 bg-zinc-50/20">
          <div className="mx-auto max-w-6xl px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
            <div className="flex items-center gap-1.5 text-[10.5px] text-ink-soft/75">
              <ShieldCheck className="size-4 text-emerald-600 animate-pulse" />
              <span>Entorno cifrado y auditado académicamente por la Cátedra</span>
            </div>
            <p className="text-[10px] text-ink-soft/60 font-semibold">
              © {new Date().getFullYear()} CosteAR. Todos los derechos reservados.
            </p>
          </div>
        </footer>

      </div>
    </div>
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
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-line/40 pb-5">
      <div className="space-y-1">
        <h1 className="font-syne text-[26px] font-extrabold tracking-tight text-granate-deep">{title}</h1>
        {description && <p className="text-xs text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
