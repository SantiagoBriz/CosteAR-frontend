import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronRight, Zap, ArrowRight,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api';

// ─── tipos ──────────────────────────────────────────────────────────────────

interface PreviewItem {
  structureId: string;
  productName: string;
  period: string;
  companyId: string;
  companyName: string;
  indicator: string;
  changePct: number;
  before: { productionCost: number; grossMarginPct: number; salesUnitPrice: number | null };
  after: { productionCost: number; grossMarginPct: number; suggestedUnitPrice: number | null };
  marginDelta: number;
}

interface PreviewResult {
  preview: PreviewItem[];
  affectedCount: number;
  indicator: string;
}

// ─── preset de cambios frecuentes ───────────────────────────────────────────
const PRESETS = [
  { label: 'UATRE +10%', factor: 1.10, code: 'PARITARIA', indicatorCode: 'UATRE_PARITARIA' },
  { label: 'UATRE +15%', factor: 1.15, code: 'PARITARIA', indicatorCode: 'UATRE_PARITARIA' },
  { label: 'Energía +20%', factor: 1.20, code: 'ARCA', indicatorCode: 'TARIFA_ENERGIA' },
  { label: 'USD +5%', factor: 1.05, code: 'BCRA', indicatorCode: 'USD_OFICIAL' },
  { label: 'IPC +3%', factor: 1.03, code: 'INDEC', indicatorCode: 'IPC_NACIONAL' },
];

// ─── componente principal ────────────────────────────────────────────────────

export function PropagacionPage() {
  const [changePct, setChangePct] = useState('');
  const [label, setLabel] = useState('');
  const [source, setSource] = useState<'BCRA' | 'INDEC' | 'ARCA' | 'PARITARIA'>('PARITARIA');
  const [indicatorCode, setIndicatorCode] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (body: { changeFactor: number; indicatorLabel: string }) => {
      const res = await api.post<{ data: PreviewResult }>('/macro/propagation-preview', body);
      return res.data.data;
    },
    onSuccess: (data) => { setPreview(data); setConfirmed(false); setError(null); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await api.post('/macro/manual-entry', {
        source,
        indicatorCode: indicatorCode || label,
        value: 1 + Number(changePct) / 100,
        effectiveDate: new Date().toISOString(),
        label,
      });
      await api.post('/macro/sync-now');
    },
    onSuccess: () => setConfirmed(true),
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const applyPreset = (p: (typeof PRESETS)[0]) => {
    const pct = ((p.factor - 1) * 100).toFixed(0);
    setChangePct(pct);
    setLabel(p.label);
    setSource(p.code as typeof source);
    setIndicatorCode(p.indicatorCode);
  };

  const handlePreview = () => {
    const factor = 1 + Number(changePct) / 100;
    if (!label || isNaN(factor) || factor <= 0) return;
    previewMutation.mutate({ changeFactor: factor, indicatorLabel: label });
  };

  if (confirmed) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Propagación confirmada</h2>
          <p className="max-w-sm text-sm text-ink-soft">
            El cambio fue registrado. El motor de recálculo actualizará todas las
            estructuras afectadas en segundo plano y generará alertas si algún margen cae bajo umbral.
          </p>
          <Button onClick={() => { setPreview(null); setConfirmed(false); setChangePct(''); setLabel(''); }}>
            Nueva propagación
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Revisión de propagación"
        description="Simulá el impacto de un cambio macro en toda tu cartera antes de confirmar"
      />

      {/* Formulario de entrada */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">
                Tipo de variable
              </label>
              <select
                className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate focus:outline-none"
                value={source}
                onChange={(e) => setSource(e.target.value as typeof source)}
              >
                <option value="PARITARIA">Paritaria / Convenio</option>
                <option value="BCRA">BCRA — Tipo de cambio</option>
                <option value="INDEC">INDEC — Índice</option>
                <option value="ARCA">ARCA — Tarifa / Energía</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">
                Descripción
              </label>
              <input
                className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate focus:outline-none"
                placeholder="Ej: UATRE paritaria Nov 2025"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-soft mb-1.5">
                Variación (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="h-10 w-full rounded-sm border border-line bg-surface pl-3 pr-8 text-sm text-ink focus:border-granate focus:outline-none"
                  placeholder="15"
                  value={changePct}
                  onChange={(e) => setChangePct(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">%</span>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handlePreview}
                loading={previewMutation.isPending}
                disabled={!label || !changePct}
              >
                <Zap className="size-4" /> Ver impacto
              </Button>
            </div>
          </div>

          {/* Presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[12px] text-ink-soft self-center">Accesos rápidos:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-full border border-line px-3 py-1 text-[12px] text-ink hover:border-granate hover:text-granate transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}

      {/* Resultados del preview */}
      {preview && (
        <>
          {/* Resumen */}
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Estructuras afectadas"
              value={String(preview.affectedCount)}
              icon={ChevronRight}
              color="text-ink"
            />
            <SummaryCard
              label="Variación promedio precio"
              value={`+${(Number(changePct) || 0).toFixed(1)}%`}
              icon={TrendingUp}
              color="text-action"
            />
            <SummaryCard
              label="Impacto en margen"
              value={`${(preview.preview.reduce((acc, p) => acc + p.marginDelta, 0) / Math.max(preview.preview.length, 1)).toFixed(1)} pts`}
              icon={TrendingDown}
              color="text-danger"
            />
          </div>

          <Card>
            <CardHeader
              title={`Detalle de propagación — ${preview.indicator}`}
              description="Costo anterior vs. proyectado por estructura. El precio sugerido mantiene el margen actual."
              action={
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate()}
                    loading={confirmMutation.isPending}
                  >
                    Confirmar y aplicar ({preview.affectedCount}) <ArrowRight className="size-4" />
                  </Button>
                </div>
              }
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
                      <th className="px-6 py-3 text-left font-medium">Empresa / Producto</th>
                      <th className="px-4 py-3 text-right font-medium">Costo anterior</th>
                      <th className="px-4 py-3 text-right font-medium">Costo nuevo</th>
                      <th className="px-4 py-3 text-right font-medium">Margen ant.</th>
                      <th className="px-4 py-3 text-right font-medium">Margen nuevo</th>
                      <th className="px-4 py-3 text-right font-medium">Precio sugerido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.preview.map((item) => (
                      <PropagationRow key={item.structureId} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {preview?.affectedCount === 0 && (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-sm text-ink-soft">
              No hay estructuras ACTIVAS con configuración completa para simular.
              Activá al menos una estructura en "Clientes".
            </p>
          </CardBody>
        </Card>
      )}
    </AppShell>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: typeof ChevronRight; color: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className={cn('flex size-10 items-center justify-center rounded-md bg-surface-alt', color)}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className={cn('text-xl font-bold tabular', color)}>{value}</div>
          <div className="text-[12px] text-ink-soft">{label}</div>
        </div>
      </CardBody>
    </Card>
  );
}

function PropagationRow({ item }: { item: PreviewItem }) {
  const marginDown = item.marginDelta < -1;
  const marginOk = item.marginDelta >= -1;

  return (
    <tr className="hover:bg-surface-alt/50">
      <td className="px-6 py-3.5">
        <div className="font-medium text-ink">{item.companyName}</div>
        <div className="text-[12px] text-ink-soft">{item.productName} · {item.period}</div>
      </td>
      <td className="px-4 py-3.5 text-right tabular text-ink">
        ${item.before.productionCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3.5 text-right tabular font-medium text-action">
        ${item.after.productionCost.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3.5 text-right tabular text-ink">
        {item.before.grossMarginPct.toFixed(1)}%
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium',
          marginDown ? 'bg-danger/10 text-danger' : 'bg-green-50 text-green-700',
        )}>
          {marginDown ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
          {item.after.grossMarginPct.toFixed(1)}%
          <span className="opacity-70">({item.marginDelta > 0 ? '+' : ''}{item.marginDelta.toFixed(1)})</span>
        </span>
      </td>
      <td className="px-4 py-3.5 text-right tabular text-ink-soft">
        {item.after.suggestedUnitPrice
          ? `$${item.after.suggestedUnitPrice.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
          : '—'}
      </td>
    </tr>
  );
}
