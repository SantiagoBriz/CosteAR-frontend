import { TrendingUp, DollarSign, Percent, Activity } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { cn, formatMoney } from '@/lib/utils';
import { useMacroLatest, useMacroHistory } from './alert-hooks';
import type { MacroSnapshot } from '@/lib/types';

type Risk = 'low' | 'mid' | 'high';

const RISK = {
  low:  { dot: 'bg-ok',     text: 'text-ok',     ring: 'border-ok/25 bg-ok/5',         label: 'Estable' },
  mid:  { dot: 'bg-warn',   text: 'text-warn',   ring: 'border-warn/25 bg-warn/5',     label: 'Atención' },
  high: { dot: 'bg-danger', text: 'text-danger', ring: 'border-danger/25 bg-danger/5', label: 'Riesgo' },
} as const;

const RANK: Record<Risk, number> = { low: 0, mid: 1, high: 2 };

function ipcRisk(v: number): Risk {
  return v > 6 ? 'high' : v >= 3 ? 'mid' : 'low';
}
function changeRisk(pct: number): Risk {
  const a = Math.abs(pct);
  return a > 5 ? 'high' : a >= 2 ? 'mid' : 'low';
}

/** Variación % entre los dos snapshots más recientes de un indicador. */
function latestChangePct(history?: MacroSnapshot[]): number | null {
  if (!history || history.length < 2) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
  );
  const cur = Number(sorted[0]!.value);
  const prev = Number(sorted[1]!.value);
  if (!isFinite(cur) || !isFinite(prev) || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function IndicatorRow({
  icon: Icon, name, value, meaning, risk, change,
}: {
  icon: typeof DollarSign;
  name: string;
  value: string;
  meaning: string;
  risk: Risk;
  change?: number | null;
}) {
  const r = RISK[risk];
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', r.ring)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn('size-4 shrink-0', r.text)} />
          <span className="truncate text-[13px] font-medium text-ink">{name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="tabular text-[13px] font-semibold text-ink">{value}</span>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', r.text)}>
            <span className={cn('size-1.5 rounded-full', r.dot)} /> {r.label}
          </span>
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-ink-soft">
        {typeof change === 'number' && (
          <span className={cn('font-medium', change >= 0 ? 'text-danger' : 'text-ok')}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% ·{' '}
          </span>
        )}
        {meaning}
      </p>
    </div>
  );
}

/**
 * Semáforo de riesgo macro: muestra, con datos reales de BCRA/INDEC, las
 * variables argentinas que amenazan el margen del costista, con 3 colores.
 */
export function MacroRiskPanel() {
  const { data: macro = [], isLoading } = useMacroLatest();
  const { data: usdHistory } = useMacroHistory('USD_OFICIAL');

  const usd = macro.find((m) => m.indicatorCode === 'USD_OFICIAL');
  const ipc = macro.find((m) => m.indicatorCode === 'IPC_NACIONAL');

  const ipcVal = ipc ? Number(ipc.value) : null;
  const usdChange = latestChangePct(usdHistory);

  const risks: Risk[] = [];
  if (ipcVal != null) risks.push(ipcRisk(ipcVal));
  if (usdChange != null) risks.push(changeRisk(usdChange));
  const overall: Risk = risks.length
    ? (['low', 'mid', 'high'] as Risk[])[Math.max(...risks.map((r) => RANK[r]))]!
    : 'low';
  const or = RISK[overall];

  return (
    <Card className="h-fit">
      <CardHeader
        title="Contexto macro"
        description="Variables que afectan tus márgenes, en tiempo real."
        action={
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', or.ring, or.text)}>
            <span className={cn('size-1.5 rounded-full', or.dot)} /> Riesgo {overall === 'low' ? 'bajo' : overall === 'mid' ? 'medio' : 'alto'}
          </span>
        }
      />
      <CardBody className="space-y-2.5">
        {isLoading && <p className="text-[12px] text-ink-soft">Sincronizando datos macro…</p>}

        {!isLoading && ipcVal != null && (
          <IndicatorRow
            icon={Percent}
            name="Inflación (IPC mensual)"
            value={`${ipcVal.toFixed(1)}%`}
            risk={ipcRisk(ipcVal)}
            meaning="Si la inflación sube, tus costos suben: conviene revisar los precios de venta."
          />
        )}

        {!isLoading && usd && (
          <IndicatorRow
            icon={DollarSign}
            name="Dólar oficial"
            value={formatMoney(Number(usd.value))}
            risk={usdChange != null ? changeRisk(usdChange) : 'low'}
            change={usdChange}
            meaning="Afecta el costo de insumos importados y las cotizaciones en USD."
          />
        )}

        {!isLoading && ipcVal == null && !usd && (
          <div className="flex items-center gap-2 text-[12px] text-ink-soft">
            <Activity className="size-4" /> Sin datos macro todavía. Se actualizan automáticamente.
          </div>
        )}

        <p className="flex items-center gap-1 pt-0.5 text-[10px] text-ink-soft">
          <TrendingUp className="size-3" /> Fuente: BCRA e INDEC · actualización automática.
        </p>
      </CardBody>
    </Card>
  );
}
