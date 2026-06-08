import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, TrendingUp, DollarSign, BarChart3, Zap, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, apiErrorMessage } from '@/lib/api';
import type { MacroSnapshot } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: typeof DollarSign }> = {
  BCRA:      { label: 'BCRA',      color: 'text-blue-600 bg-blue-50',   icon: DollarSign },
  INDEC:     { label: 'INDEC',     color: 'text-purple-600 bg-purple-50', icon: BarChart3 },
  ARCA:      { label: 'ARCA',      color: 'text-orange-600 bg-orange-50', icon: Zap },
  PARITARIA: { label: 'Paritaria', color: 'text-granate bg-granate-tenue', icon: TrendingUp },
};

const INDICATOR_LABELS: Record<string, string> = {
  USD_OFICIAL:     'Dólar oficial ($/USD)',
  IPC_NACIONAL:    'IPC Nacional (var. mensual %)',
  UATRE_PARITARIA: 'Paritaria UATRE',
  TARIFA_ENERGIA:  'Tarifa energía ($/kWh)',
};

export function MacroPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => { await api.post('/macro/sync-now'); },
    onSuccess: () => {
      setSyncMsg('Sincronización con BCRA e INDEC encolada. Los datos se actualizarán en segundos.');
      setTimeout(() => { qc.invalidateQueries({ queryKey: ['macro'] }); setSyncMsg(null); }, 4000);
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="Variables macro"
        description="Tipo de cambio, inflación e índices que impactan tus costos"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="size-4" /> Cargar manual
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => syncNow.mutate()}
              loading={syncNow.isPending}
            >
              <RefreshCw className="size-4" /> Sincronizar BCRA/INDEC
            </Button>
            <Link to="/propagacion">
              <Button size="sm">
                <Zap className="size-4" /> Ver impacto en cartera
              </Button>
            </Link>
          </div>
        }
      />

      {syncMsg && (
        <div className="mb-4 rounded-sm bg-action/10 px-3 py-2 text-[13px] text-action">{syncMsg}</div>
      )}

      {showForm && <ManualEntryForm onDone={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['macro'] }); }} />}

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : !data?.length ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-sm text-ink-soft mb-3">
              Todavía no hay datos macro. Hacé clic en "Sincronizar BCRA/INDEC" para traer los valores actuales.
            </p>
            <Button size="sm" onClick={() => syncNow.mutate()} loading={syncNow.isPending}>
              <RefreshCw className="size-4" /> Sincronizar ahora
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => {
            const cfg = SOURCE_CONFIG[m.source] ?? SOURCE_CONFIG.BCRA;
            const Icon = cfg.icon;
            const friendlyLabel = INDICATOR_LABELS[m.indicatorCode] ?? m.indicatorCode;
            return (
              <Card key={m.id} className="transition-shadow hover:shadow-md">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn('flex size-9 items-center justify-center rounded-md', cfg.color)}>
                      <Icon className="size-4" />
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="mt-3 text-[13px] text-ink-soft">{friendlyLabel}</div>
                  <div className="mt-1 tabular text-2xl font-bold text-ink">
                    {Number(m.value).toLocaleString('es-AR', { maximumFractionDigits: 4 })}
                  </div>
                  <div className="mt-2 text-[11px] text-ink-soft/60">
                    Efectivo: {formatDate(m.effectiveDate)}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function ManualEntryForm({ onDone }: { onDone: () => void }) {
  const [source, setSource] = useState<'BCRA' | 'INDEC' | 'ARCA' | 'PARITARIA'>('PARITARIA');
  const [indicatorCode, setIndicatorCode] = useState('');
  const [value, setValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      await api.post('/macro/manual-entry', {
        source,
        indicatorCode,
        value: Number(value),
        effectiveDate: new Date(effectiveDate).toISOString(),
      });
    },
    onSuccess: onDone,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Card className="mb-6 animate-rise border-action/30">
      <CardHeader
        title="Cargar variable manualmente"
        description="Paritarias, tarifas u otros índices no automáticos"
        action={
          <button type="button" onClick={onDone} className="text-ink-soft hover:text-ink">
            <X className="size-4" />
          </button>
        }
      />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">Fuente</label>
            <select
              className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate"
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
            >
              <option value="PARITARIA">Paritaria</option>
              <option value="ARCA">ARCA / Energía</option>
              <option value="BCRA">BCRA</option>
              <option value="INDEC">INDEC</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">Código indicador</label>
            <input
              className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate focus:outline-none"
              placeholder="Ej: UATRE_PARITARIA"
              value={indicatorCode}
              onChange={(e) => setIndicatorCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">Valor / Factor</label>
            <input
              type="number"
              step="0.01"
              className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate focus:outline-none"
              placeholder="1.15 (= +15%)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">Fecha efectiva</label>
            <input
              type="date"
              className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate focus:outline-none"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!indicatorCode || !value}>
            Guardar y recalcular
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
        </div>
      </CardBody>
    </Card>
  );
}
