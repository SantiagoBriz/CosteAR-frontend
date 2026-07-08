import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Building2, Bell, LogOut, ClipboardCheck, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { usePendingCount } from '@/features/validaciones/validaciones-hooks';
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

  return (
    <div className="flex flex-col min-h-screen bg-surface-alt font-outfit overflow-x-hidden relative">
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

      {/* Ambient background glows for cohesiveness */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[550px] w-[550px] rounded-full bg-granate-tenue opacity-60 blur-[130px] animate-orb-1 z-0" />
      <div className="pointer-events-none absolute right-[-5%] bottom-[-5%] h-[500px] w-[500px] rounded-full bg-action-soft/5 opacity-40 blur-[120px] animate-orb-2 z-0" />

      {/* Floating Horizontal Header (Glassmorphic, Matches Landing Page Navbar) */}
      <header className="sticky top-4 z-40 mx-4 sm:mx-8 mt-4">
        <div className="flex h-16 items-center justify-between rounded-2xl border border-line/65 bg-surface/80 px-6 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <CosteARLogo className="h-6.5 w-auto text-granate" />
            <span className="text-[17px] font-syne font-extrabold tracking-tight text-granate">CosteAR</span>
          </div>

          {/* Horizontal Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => {
              const active = location.pathname.startsWith(to);
              const showBadge = 'badge' in rest && rest.badge && pendingCount > 0;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4.5 py-2 text-[13px] font-bold transition-all relative',
                    active
                      ? 'bg-granate text-white shadow-md shadow-granate/10'
                      : 'text-ink-soft hover:text-granate hover:bg-granate-tenue/30'
                  )}
                >
                  <Icon className="size-[15px] shrink-0" />
                  <span>{label}</span>
                  {showBadge && (
                    <span className="flex items-center justify-center rounded-full bg-action text-[9.5px] font-extrabold text-white px-1.5 py-0.5 ml-1 shadow-sm">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Area (Actions & Profile) */}
          <div className="flex items-center gap-4">
            {/* Operator Portal button (brand action styled) */}
            <Link
              to="/portal"
              className="hidden lg:flex items-center gap-1.5 rounded-full border border-action/10 bg-action/5 px-3.5 py-2 text-[11px] font-bold text-action hover:bg-action/10 transition-all"
            >
              <Zap className="size-[13px] shrink-0" />
              <span>Portal de Operador</span>
            </Link>

            {/* Profile Avatar / Initials Link */}
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-2 rounded-full border border-line bg-surface/50 p-1 pr-3 hover:bg-zinc-100/50 hover:border-granate/20 transition-all",
                location.pathname.startsWith('/profile') && "border-granate/25 bg-granate-tenue text-granate"
              )}
              title="Mi perfil"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-6 shrink-0 rounded-full object-cover border border-line" />
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-granate-tenue text-[10.5px] font-bold text-granate border border-granate/10">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              )}
              <span className="text-[11.5px] font-bold text-ink truncate max-w-[80px]">{user?.name?.split(' ')[0] ?? 'Perfil'}</span>
            </Link>

            {/* Logout button */}
            <button
              onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
              className="flex size-8 items-center justify-center rounded-full border border-line bg-surface/50 text-ink-soft hover:text-danger hover:border-danger/20 hover:bg-red-50/50 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="size-[15px] shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Takes full-width, no sidebar offset!) */}
      <main className="flex-1 relative z-10">
        <div className={cn('mx-auto px-4 sm:px-8 py-8', wide ? 'max-w-[90rem]' : 'max-w-6xl')}>{children}</div>
      </main>

      {/* Footer / Safety Badge */}
      <footer className="relative z-10 border-t border-line/40 py-6 mt-auto bg-zinc-50/20">
        <div className="mx-auto max-w-6xl px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          <div className="flex items-center gap-1.5 text-[10.5px] text-ink-soft/75">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Sistema validado académicamente por la Cátedra de Costos · FCE — UNT</span>
          </div>
          <p className="text-[10px] text-ink-soft/60 font-semibold">
            © {new Date().getFullYear()} CosteAR. Todos los derechos reservados.
          </p>
        </div>
      </footer>
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
