import { cn } from '@/lib/utils';

type Status = 'ok' | 'warn' | 'idle' | 'danger';

/*
 * Chip de estado: pill con borde, fondo tenue, punto de color sólido y texto
 * bold uppercase — mismo patrón que los chips de industria/salud del dashboard.
 * SIEMPRE con texto, nunca solo color (accesibilidad — regla de la guía).
 */
const config: Record<Status, { dot: string; bg: string; text: string; border: string }> = {
  ok: { dot: 'bg-ok', bg: 'bg-ok/10', text: 'text-ok', border: 'border-ok/20' },
  warn: { dot: 'bg-warn', bg: 'bg-warn/10', text: 'text-warn', border: 'border-warn/20' },
  idle: { dot: 'bg-idle', bg: 'bg-idle/10', text: 'text-idle', border: 'border-idle/20' },
  danger: { dot: 'bg-danger', bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20' },
};

export function StatusBadge({ status, children }: { status: Status; children: React.ReactNode }) {
  const c = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide shadow-sm',
        c.bg,
        c.text,
        c.border,
      )}
    >
      <span className={cn('size-1.5 rounded-full', c.dot)} />
      {children}
    </span>
  );
}

/** Deriva el estado del semáforo a partir de un margen y su umbral. */
export function marginStatus(marginPct: number, thresholdPct: number): Status {
  if (marginPct < 0) return 'danger';
  if (marginPct < thresholdPct) return 'warn';
  return 'ok';
}
