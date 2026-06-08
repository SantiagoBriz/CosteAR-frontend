import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/utils';

/*
 * Celda monetaria: SIEMPRE monoespaciada, alineada a la derecha. Es el patrón
 * más importante del producto — los costistas leen columnas de números y el
 * tabular-nums evita errores de lectura.
 */
export function Money({
  value,
  className,
  negative,
}: {
  value: number | string | null | undefined;
  className?: string;
  negative?: boolean;
}) {
  const n = typeof value === 'string' ? Number(value) : value;
  const isNeg = negative ?? (typeof n === 'number' && n < 0);
  return (
    <span className={cn('tabular text-right', isNeg && 'text-danger', className)}>
      {formatMoney(value)}
    </span>
  );
}

export function Percent({
  value,
  colorize,
  className,
}: {
  value: number | null | undefined;
  colorize?: boolean;
  className?: string;
}) {
  const tone =
    colorize && typeof value === 'number'
      ? value < 0
        ? 'text-danger'
        : value < 15
          ? 'text-warn'
          : 'text-ok'
      : '';
  return <span className={cn('tabular', tone, className)}>{formatPercent(value)}</span>;
}
