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

      {/* FLOATING VERTICAL SIDEBAR DOCK (Bordó Wine Red, Overflow Visible) */}
      <aside className="fixed top-4 bottom-4 left-4 w-20 bg-granate rounded-[30px] flex flex-col items-center py-6 justify-between shadow-[0_16px_40px_rgba(74,21,27,0.08)] z-30 overflow-visible">
        
        {/* Top: Logo in white container */}
        <div className="flex flex-col items-center overflow-visible">
          <div className="flex size-12 items-center justify-center rounded-[18px] bg-white text-granate shadow-md hover:scale-105 transition-transform duration-300">
            <CosteARLogo className="h-6.5 w-auto text-granate" />
          </div>
        </div>

        {/* Center: Main Nav Icons (Negative Border-Radius Curved Tab Design) */}
        <nav className="flex flex-col gap-4 w-full items-stretch overflow-visible">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => {
            const active = location.pathname.startsWith(to);
            const showBadge = 'badge' in rest && rest.badge && pendingCount > 0;
            return (
              <div key={to} className="relative w-full h-12 flex items-center justify-center overflow-visible">
                {active ? (
                  /* Active tab - blends into content page with smooth negative border-radius curves */
                  <Link
                    to={to}
                    className="w-full h-12 relative flex items-center justify-start text-granate z-20 overflow-visible"
                  >
                    {/* Background tab shape (inset from the left by 10px, matches the mockup spacing) */}
                    <div className="absolute left-2.5 right-0 top-0 bottom-0 bg-surface-alt rounded-l-[20px] z-10" />
                    
                    {/* Seamless extension to cover the sidebar-content gap */}
                    <div className="absolute left-20 right-[-16px] top-0 bottom-0 bg-surface-alt z-10" />
                    
                    {/* Top curve (solid bordó with bottom-right rounded corner) */}
                    <div className="absolute right-0 bottom-full w-4 h-4 bg-granate rounded-br-[16px] z-10 pointer-events-none" />
                    
                    {/* Bottom curve (solid bordó with top-right rounded corner) */}
                    <div className="absolute right-0 top-full w-4 h-4 bg-granate rounded-tr-[16px] z-10 pointer-events-none" />

                    {/* Centered icon on the 80px line */}
                    <div className="absolute left-0 w-20 h-full flex items-center justify-center z-30 pointer-events-none">
                      <Icon className="size-[20px]" />
                    </div>

                    {showBadge && (
                      <span className="absolute top-1.5 right-3.5 flex size-4.5 items-center justify-center rounded-full bg-action text-[9px] font-extrabold text-white shadow-sm border border-white z-40">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </Link>
                ) : (
                  /* Inactive tab - standard clean icon centering */
                  <Link
                    to={to}
                    className="w-full h-12 relative flex items-center justify-center text-white/70 hover:text-white rounded-[18px] hover:bg-white/5 z-10 group"
                  >
                    <Icon className="size-[20px] shrink-0" />
                    
                    {/* Hover tooltips */}
                    <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                      {label}
                    </span>

                    {showBadge && (
                      <span className="absolute top-1.5 right-3.5 flex size-4.5 items-center justify-center rounded-full bg-action text-[9px] font-extrabold text-white border border-granate">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom: Portal, Profile, Logout */}
        <div className="flex flex-col items-center gap-3.5 w-full overflow-visible">
          {/* Operator Portal Link */}
          <Link
            to="/portal"
            className="flex size-12 items-center justify-center rounded-[18px] text-granate-tenue hover:text-white hover:bg-white/10 transition-all duration-200 relative group"
          >
            <Zap className="size-[20px]" />
            <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
              Portal de Operador
            </span>
          </Link>

          {/* Profile link */}
          <div className="relative w-full h-12 flex items-center justify-center overflow-visible">
            {location.pathname.startsWith('/profile') ? (
              <Link
                to="/profile"
                className="w-full h-12 relative flex items-center justify-start text-granate z-20 overflow-visible"
              >
                <div className="absolute left-2.5 right-0 top-0 bottom-0 bg-surface-alt rounded-l-[20px] z-10" />
                <div className="absolute left-20 right-[-16px] top-0 bottom-0 bg-surface-alt z-10" />
                <div className="absolute right-0 bottom-full w-4 h-4 bg-granate rounded-br-[16px] z-10 pointer-events-none" />
                <div className="absolute right-0 top-full w-4 h-4 bg-granate rounded-tr-[16px] z-10 pointer-events-none" />
                
                {/* Centered avatar or initials */}
                <div className="absolute left-0 w-20 h-full flex items-center justify-center z-30 pointer-events-none">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover border border-granate/10" />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-granate-tenue text-xs font-bold text-granate border border-granate/10">
                      {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="w-full h-12 relative flex items-center justify-center text-white/70 hover:text-white rounded-[18px] hover:bg-white/5 z-10 group"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover border border-white/20" />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white border border-white/20">
                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                )}
                <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                  Mi Perfil
                </span>
              </Link>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
            className="flex size-12 items-center justify-center rounded-[18px] text-white/70 hover:text-white hover:bg-red-900/40 transition-all duration-200 cursor-pointer relative group"
          >
            <LogOut className="size-[20px]" />
            <span className="absolute left-18 bg-granate-deep border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
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
