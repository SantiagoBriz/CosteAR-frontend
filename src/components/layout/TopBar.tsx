import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAlerts } from '@/features/alerts/alert-hooks';

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { data: alerts = [] } = useAlerts();
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line/40 px-8 py-5">
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
          className="relative p-2 rounded-full border border-line bg-surface-alt/40 text-ink-soft hover:text-granate hover:bg-surface-alt/70 transition-all shadow-sm"
          title="Alertas"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-action animate-pulse" />
          )}
        </Link>

        {/* Profile Detail Card */}
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface-alt/50 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
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
  );
}
