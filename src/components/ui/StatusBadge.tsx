import { cn } from '@/lib/utils';

type Status = 'ok' | 'warn' | 'idle' | 'danger';

/*
 * Badge de estado: fondo tenue, punto de color sólido y texto corto.
 * SIEMPRE con texto, nunca solo color (accesibilidad — regla de la guía).
 */
const config: Record<Status, { dot: string; bg: string; text: string }> = {
  ok: { dot: 'bg-ok', bg: 'bg-ok/10', text: 'text-ok' },
  warn: { dot: 'bg-warn', bg: 'bg-warn/10', text: 'text-warn' },
  idle: { dot: 'bg-idle', bg: 'bg-idle/10', text: 'text-idle' },
  danger: { dot: 'bg-danger', bg: 'bg-danger/10', text: 'text-danger' },
};

export function StatusBadge({ status, children }: { status: Status; children: React.ReactNode }) {
  const c = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[12px] font-medium',
        c.bg,
        c.text,
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
