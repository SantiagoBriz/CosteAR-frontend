import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, Calculator, Package, Users, Factory,
  TrendingUp, BarChart2, CheckCircle2, Zap, History,
  Download,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge, marginStatus } from '@/components/ui/StatusBadge';
import { Money, Percent } from '@/components/ui/Money';
import {
  useCostStructure,
  useUpdateCostSection,
  useUpdateSales,
  useCalculate,
  useLatestCalculation,
  useSimulate,
  useCalculationHistory,
} from './cost-structure-hooks';
import { catedraExample } from './catedra-example';
import { RawMaterialForm } from './RawMaterialForm';
import { DirectLaborForm } from './DirectLaborForm';
import { IndirectCostsForm } from './IndirectCostsForm';
import type { RawMaterialConfig, DirectLaborConfig, IndirectCostConfig } from './cost-structure-types';
import { apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { CalculationResult, CostCalculation } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionTab = 'raw-material' | 'direct-labor' | 'indirect-costs' | 'sales' | 'result';
type ResultView  = 'result' | 'simulator' | 'history';

// ── Page ──────────────────────────────────────────────────────────────────────

export function CostStructurePage() {
  const { id } = useParams({ from: '/cost-structures/$id' });
  const { data: structure, isLoading } = useCostStructure(id);
  const updateSection = useUpdateCostSection(id);
  const updateSales   = useUpdateSales(id);
  const calculate     = useCalculate(id);
  const { data: latest } = useLatestCalculation(id);

  const [activeTab, setActiveTab] = useState<SectionTab>('raw-material');
  const [result,    setResult]    = useState<CalculationResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  // Preload — se llenan al pulsar "Cargar ejemplo"; nunca tocan la DB
  const [mpPreload,  setMpPreload]  = useState<RawMaterialConfig | undefined>();
  const [modPreload, setModPreload] = useState<DirectLaborConfig | undefined>();
  const [cipPreload, setCipPreload] = useState<IndirectCostConfig | undefined>();

  const configured = {
    mp:    !!structure?.rawMaterialConfig,
    mod:   !!structure?.directLaborConfig,
    cip:   !!structure?.indirectCostConfig,
    sales: !!(structure?.salesUnitPrice && structure?.salesQuantity),
  };
  const allReady = configured.mp && configured.mod && configured.cip && configured.sales;
  const shown    = result ?? (latest ? latestToResult(latest) : null);

  const saveSection = async (
    section: 'raw-material' | 'direct-labor' | 'indirect-costs',
    config: unknown,
  ) => {
    setError(null);
    try {
      await updateSection.mutateAsync({ section, config });
      const next: Record<string, SectionTab> = {
        'raw-material':   'direct-labor',
        'direct-labor':   'indirect-costs',
        'indirect-costs': 'sales',
      };
      setActiveTab(next[section] ?? 'result');
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  // Solo reset local — sin tocar la DB
  const loadExample = (section: 'raw-material' | 'direct-labor' | 'indirect-costs') => {
    if (section === 'raw-material')   setMpPreload(catedraExample.rawMaterial as unknown as RawMaterialConfig);
    if (section === 'direct-labor')   setModPreload(catedraExample.directLabor as unknown as DirectLaborConfig);
    if (section === 'indirect-costs') setCipPreload(catedraExample.indirectCosts as unknown as IndirectCostConfig);
  };

  const runCalculate = async () => {
    setError(null);
    try {
      const data = await calculate.mutateAsync();
      setResult(data.result);
      setActiveTab('result');
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-ink-soft">Cargando…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/companies/$id"
            params={{ id: structure?.companyId ?? '' }}
            className="mb-1.5 flex items-center gap-1 text-[13px] text-granate hover:text-action"
          >
            <ArrowLeft className="size-3.5" /> Volver a la empresa
          </Link>
          <h1 className="text-2xl font-bold text-ink">{structure?.productName ?? 'Estructura de costos'}</h1>
          <p className="text-sm text-ink-soft">Período {structure?.period}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={!allReady}>
            <Download className="size-4" /> Exportar
          </Button>
          <Button onClick={runCalculate} loading={calculate.isPending} disabled={!allReady}>
            <Calculator className="size-4" /> Calcular
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-3 text-danger/60 hover:text-danger">✕</button>
        </div>
      )}

      {/* Aviso de progreso */}
      {!allReady && (
        <div className="mb-4 rounded-md border border-action/20 bg-action/5 px-4 py-2.5 text-[13px] text-ink">
          Completá las 4 secciones para calcular.{' '}
          <button
            type="button"
            className="font-semibold text-granate underline-offset-2 hover:underline"
            onClick={() => {
              loadExample('raw-material');
              loadExample('direct-labor');
              loadExample('indirect-costs');
            }}
          >
            Cargar todos los ejemplos
          </button>{' '}
          para explorar el flujo con datos reales de la cátedra.
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-4 flex gap-0 overflow-x-auto border-b border-line">
        {(
          [
            { id: 'raw-material'    as SectionTab, label: 'Materia Prima',        icon: Package,    configKey: 'mp'    as const },
            { id: 'direct-labor'    as SectionTab, label: 'Mano de Obra',          icon: Users,      configKey: 'mod'   as const },
            { id: 'indirect-costs'  as SectionTab, label: 'Costos Indirectos',     icon: Factory,    configKey: 'cip'   as const },
            { id: 'sales'           as SectionTab, label: 'Venta',                 icon: TrendingUp, configKey: 'sales' as const },
            { id: 'result'          as SectionTab, label: 'Resultado',             icon: BarChart2,  configKey: undefined },
          ] as { id: SectionTab; label: string; icon: typeof Package; configKey: keyof typeof configured | undefined }[]
        ).map(({ id: tabId, label, icon: Icon, configKey }) => {
          const isDone = configKey ? configured[configKey] : !!shown;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-medium transition-colors',
                activeTab === tabId
                  ? 'border-granate text-granate'
                  : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              <Icon className="size-4" />
              {label}
              {isDone && <CheckCircle2 className="size-3.5 text-ok" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'raw-material' && (
        <SectionShell
          title="Materia Prima"
          description="Lote óptimo de Wilson · Política de stock · Ficha PPP (Precio Promedio Ponderado)"
          configured={configured.mp}
          onLoadExample={() => loadExample('raw-material')}
        >
          <RawMaterialForm
            defaultValues={structure?.rawMaterialConfig as RawMaterialConfig | undefined}
            preloadValues={mpPreload}
            onSave={(d) => saveSection('raw-material', d)}
            saving={updateSection.isPending}
          />
        </SectionShell>
      )}

      {activeTab === 'direct-labor' && (
        <SectionShell
          title="Mano de Obra Directa"
          description="Días hábiles efectivos · ITCS (Índice Total de Cargas Sociales) · Tarifa horaria por departamento"
          configured={configured.mod}
          onLoadExample={() => loadExample('direct-labor')}
        >
          <DirectLaborForm
            defaultValues={structure?.directLaborConfig as DirectLaborConfig | undefined}
            preloadValues={modPreload}
            onSave={(d) => saveSection('direct-labor', d)}
            saving={updateSection.isPending}
          />
        </SectionShell>
      )}

      {activeTab === 'indirect-costs' && (
        <SectionShell
          title="Costos Indirectos de Producción"
          description="Centros de costo · Prorrateo primario y secundario · Cuotas por hora y variaciones"
          configured={configured.cip}
          onLoadExample={() => loadExample('indirect-costs')}
        >
          <IndirectCostsForm
            defaultValues={structure?.indirectCostConfig as IndirectCostConfig | undefined}
            preloadValues={cipPreload}
            onSave={(d) => saveSection('indirect-costs', d)}
            saving={updateSection.isPending}
          />
        </SectionShell>
      )}

      {activeTab === 'sales' && (
        <SalesTab
          defaultPrice={structure?.salesUnitPrice ? Number(structure.salesUnitPrice) : undefined}
          defaultQty={structure?.salesQuantity ? Number(structure.salesQuantity) : undefined}
          onSave={async (p, q) => {
            setError(null);
            try {
              await updateSales.mutateAsync({ salesUnitPrice: p, salesQuantity: q });
              setActiveTab('result');
            } catch (e) { setError(apiErrorMessage(e)); }
          }}
          saving={updateSales.isPending}
          allReady={allReady}
          onCalculate={runCalculate}
          calculating={calculate.isPending}
        />
      )}

      {activeTab === 'result' && (
        <ResultTab result={shown} structureId={id} />
      )}
    </AppShell>
  );
}

// ── SectionShell ──────────────────────────────────────────────────────────────

function SectionShell({
  title, description, configured, onLoadExample, children,
}: {
  title: string;
  description: string;
  configured: boolean;
  onLoadExample: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-3">
            {configured && (
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-ok">
                <CheckCircle2 className="size-3.5" /> Guardado
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={onLoadExample}>
              Cargar ejemplo
            </Button>
          </div>
        }
      />
      <CardBody className="px-6 pb-6 pt-0">
        {children}
      </CardBody>
    </Card>
  );
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────

function SalesTab({
  defaultPrice, defaultQty, onSave, saving, allReady, onCalculate, calculating,
}: {
  defaultPrice?: number;
  defaultQty?: number;
  onSave: (p: number, q: number) => Promise<void>;
  saving: boolean;
  allReady: boolean;
  onCalculate: () => void;
  calculating: boolean;
}) {
  const { register, handleSubmit } = useForm<{ unitPrice: number; quantity: number }>({
    defaultValues: { unitPrice: defaultPrice, quantity: defaultQty },
  });
  return (
    <Card>
      <CardHeader
        title="Datos de venta"
        description="Precio unitario y cantidad producida para calcular el margen bruto"
      />
      <CardBody>
        <form onSubmit={handleSubmit((v) => onSave(Number(v.unitPrice), Number(v.quantity)))} className="max-w-sm space-y-4">
          <Input label="Precio de venta unitario $" type="number" step="0.01" numeric
            {...register('unitPrice', { required: true, valueAsNumber: true })} />
          <Input label="Cantidad producida / vendida" type="number" step="1" numeric
            {...register('quantity', { required: true, valueAsNumber: true })} />
          <div className="flex gap-3 pt-1">
            <Button type="submit" variant="secondary" loading={saving}>Guardar precio</Button>
            {allReady && (
              <Button type="button" onClick={onCalculate} loading={calculating}>
                <Calculator className="size-4" /> Calcular ahora
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

// ── Result Tab ────────────────────────────────────────────────────────────────

function ResultTab({ result, structureId }: { result: CalculationResult | null; structureId: string }) {
  const [view, setView] = useState<ResultView>('result');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-line">
        {([
          { id: 'result'    as ResultView, label: 'Resultado', icon: BarChart2 },
          { id: 'simulator' as ResultView, label: 'Simulador', icon: Zap },
          { id: 'history'   as ResultView, label: 'Historial', icon: History },
        ] as { id: ResultView; label: string; icon: typeof BarChart2 }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setView(id)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-4 pb-2.5 text-[13px] font-medium transition-colors',
              view === id ? 'border-granate text-granate' : 'border-transparent text-ink-soft hover:text-ink',
            )}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {view === 'result'    && (result ? <ResultPanel result={result} /> : <EmptyResult />)}
      {view === 'simulator' && <SimulatorPanel structureId={structureId} baseResult={result} />}
      {view === 'history'   && <HistoryPanel structureId={structureId} />}
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: CalculationResult }) {
  const rows = [
    { label: 'Materia Prima consumida', value: result.rawMaterialConsumed },
    { label: 'Mano de Obra Directa',    value: result.directLaborTotal },
    { label: 'CIP aplicados',           value: result.indirectCostsApplied },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {/* Izquierda: tablas */}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Desglose de costos" />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="px-6 py-3 text-left font-semibold">Concepto</th>
                  <th className="px-6 py-3 text-right font-semibold">Importe</th>
                  <th className="px-6 py-3 text-right font-semibold">% s/costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.label} className="hover:bg-surface-alt/40">
                    <td className="px-6 py-3 text-ink-soft">{r.label}</td>
                    <td className="px-6 py-3 text-right"><Money value={r.value} /></td>
                    <td className="px-6 py-3 text-right text-ink-soft">
                      {result.productionCost > 0 ? `${((r.value / result.productionCost) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-alt font-semibold">
                  <td className="px-6 py-3.5 text-ink">Costo de producción</td>
                  <td className="px-6 py-3.5 text-right"><Money value={result.productionCost} /></td>
                  <td className="px-6 py-3.5 text-right text-ink-soft">100%</td>
                </tr>
                <tr className="bg-granate-tenue font-bold">
                  <td className="px-6 py-3.5 text-granate">Costo de productos vendidos (COGS)</td>
                  <td className="px-6 py-3.5 text-right"><Money value={result.costOfGoodsSold} className="text-granate" /></td>
                  <td className="px-6 py-3.5" />
                </tr>
              </tbody>
            </table>
          </CardBody>
        </Card>

        {Object.keys(result.detail.indirectCosts.perDepartment).length > 0 && (
          <Card>
            <CardHeader title="Análisis de variaciones — CIP" description="Variación presupuestaria y de volumen por centro productivo" />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
                    {['Departamento','CIP total','CIP aplicado','Var. presup.','Var. volumen'].map((h) => (
                      <th key={h} className={cn('px-6 py-3 font-semibold', h === 'Departamento' ? 'text-left' : 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(result.detail.indirectCosts.perDepartment).map(([dept, d]) => (
                    <tr key={dept} className="hover:bg-surface-alt/40">
                      <td className="px-6 py-3 font-medium text-ink">{dept}</td>
                      <td className="px-6 py-3 text-right"><Money value={d.cipTotal} /></td>
                      <td className="px-6 py-3 text-right"><Money value={d.appliedCip} /></td>
                      <td className={cn('px-6 py-3 text-right', d.budgetVariance < 0 ? 'text-danger' : 'text-ok')}><Money value={d.budgetVariance} /></td>
                      <td className={cn('px-6 py-3 text-right', d.volumeVariance < 0 ? 'text-danger' : 'text-ok')}><Money value={d.volumeVariance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Derecha: margen + detalles */}
      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-3 py-8 text-center">
            <p className="text-[11px] uppercase tracking-widest text-ink-soft">Margen bruto</p>
            <Percent value={result.grossMarginPct} colorize className="text-5xl font-bold" />
            <Money value={result.grossMargin} className="block text-lg text-ink-soft" />
            <div className="pt-2">
              <StatusBadge status={marginStatus(result.grossMarginPct, 15)}>
                {result.grossMarginPct < 0 ? 'Venta a pérdida' : result.grossMarginPct < 15 ? 'Margen ajustado' : 'Margen sano'}
              </StatusBadge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Detalle MOD" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Días hábiles efectivos</span><span className="font-medium">{result.detail.directLabor.workingDays} días</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">ITCS</span><span className="font-medium">{(result.detail.directLabor.itcsPercent * 100).toFixed(2)}%</span></div>
            {Object.entries(result.detail.directLabor.hourlyRates).map(([dept, rate]) => (
              <div key={dept} className="flex justify-between">
                <span className="text-ink-soft">{dept}</span>
                <span><Money value={rate} className="font-medium" /><span className="ml-1 text-[11px] text-ink-soft">/h</span></span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Detalle MP" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Lote óptimo</span><span className="font-medium">{result.detail.rawMaterial.optimalLot.toFixed(0)} u</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Stock final</span><span className="font-medium">{result.detail.rawMaterial.finalStockQty.toFixed(0)} u</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Valor stock final</span><Money value={result.detail.rawMaterial.finalStockValue} className="font-medium" /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function EmptyResult() {
  return (
    <Card>
      <CardBody className="py-20 text-center">
        <Calculator className="mx-auto size-10 text-idle" />
        <p className="mt-3 text-sm text-ink-soft">
          Completá las secciones y presioná <strong>Calcular</strong> para ver el estado de costos.
        </p>
      </CardBody>
    </Card>
  );
}

// ── Simulator ─────────────────────────────────────────────────────────────────

function SimulatorPanel({ structureId, baseResult }: { structureId: string; baseResult: CalculationResult | null }) {
  const simulate = useSimulate(structureId);
  const [simResult, setSimResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<{ salesUnitPrice: string; salesQuantity: string; macroFactor: string }>({
    defaultValues: { macroFactor: '1' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const overrides: Record<string, number> = {};
      if (v.salesUnitPrice) overrides.salesUnitPrice = Number(v.salesUnitPrice);
      if (v.salesQuantity)  overrides.salesQuantity  = Number(v.salesQuantity);
      if (v.macroFactor && Number(v.macroFactor) !== 1) overrides.macroFactor = Number(v.macroFactor);
      const r = await simulate.mutateAsync(overrides);
      setSimResult(r);
    } catch (e) { setError(apiErrorMessage(e)); }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Simulador what-if" description="Modificá precio, cantidad o factor macro y mirá el impacto sin guardar nada." />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Precio unitario $" type="number" step="0.01" numeric placeholder="Sin cambio" {...register('salesUnitPrice')} />
              <Input label="Cantidad" type="number" step="1" numeric placeholder="Sin cambio" {...register('salesQuantity')} />
              <Input label="Factor macro (1.15 = +15%)" type="number" step="0.01" numeric {...register('macroFactor')} />
            </div>
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <Button type="submit" loading={simulate.isPending}><Zap className="size-4" /> Simular</Button>
          </form>
        </CardBody>
      </Card>

      {simResult && baseResult && (
        <Card>
          <CardHeader
            title="Antes vs. después"
            action={
              <span className={cn('rounded-full px-3 py-1 text-[13px] font-semibold',
                simResult.grossMarginPct >= baseResult.grossMarginPct ? 'bg-green-50 text-green-700' : 'bg-danger/10 text-danger')}>
                {baseResult.grossMarginPct.toFixed(1)}% → {simResult.grossMarginPct.toFixed(1)}%
                {' '}({simResult.grossMarginPct - baseResult.grossMarginPct > 0 ? '+' : ''}{(simResult.grossMarginPct - baseResult.grossMarginPct).toFixed(1)} pts)
              </span>
            }
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
                  {['Concepto','Base','Simulado','Δ'].map((h, i) => (
                    <th key={h} className={cn('px-6 py-3 font-semibold', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  { label: 'Costo de producción', base: baseResult.productionCost,  sim: simResult.productionCost },
                  { label: 'COGS',                base: baseResult.costOfGoodsSold, sim: simResult.costOfGoodsSold },
                  { label: 'Margen bruto $',      base: baseResult.grossMargin,     sim: simResult.grossMargin },
                ].map((r) => {
                  const d = r.sim - r.base;
                  return (
                    <tr key={r.label} className="hover:bg-surface-alt/40">
                      <td className="px-6 py-3 text-ink-soft">{r.label}</td>
                      <td className="px-6 py-3 text-right"><Money value={r.base} /></td>
                      <td className="px-6 py-3 text-right font-medium"><Money value={r.sim} /></td>
                      <td className={cn('px-6 py-3 text-right text-[12px]', d > 0 ? 'text-ok' : d < 0 ? 'text-danger' : 'text-ink-soft')}>
                        {d > 0 ? '+' : ''}<Money value={d} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function HistoryPanel({ structureId }: { structureId: string }) {
  const { data: history, isLoading } = useCalculationHistory(structureId);
  if (isLoading) return <p className="text-sm text-ink-soft">Cargando…</p>;
  if (!history?.length) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-sm text-ink-soft">No hay cálculos todavía. Presioná <strong>Calcular</strong> para crear el primero.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Historial de cálculos" description="Últimos 50 snapshots" />
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
              {['Fecha','Costo prod.','COGS','Margen'].map((h, i) => (
                <th key={h} className={cn('px-6 py-3 font-semibold', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((c, i) => (
              <tr key={c.id} className={cn('hover:bg-surface-alt/50', i === 0 && 'bg-action/5')}>
                <td className="px-6 py-3 text-ink">
                  {formatDate(c.calculatedAt)}
                  {i === 0 && <span className="ml-2 rounded-full bg-action/10 px-2 py-0.5 text-[10px] font-semibold text-action">Último</span>}
                </td>
                <td className="px-6 py-3 text-right"><Money value={Number(c.productionCost)} /></td>
                <td className="px-6 py-3 text-right"><Money value={Number(c.costOfGoodsSold)} /></td>
                <td className="px-6 py-3 text-right"><Percent value={Number(c.grossMarginPct)} colorize /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function latestToResult(latest: CostCalculation): CalculationResult {
  return {
    rawMaterialConsumed:  Number(latest.rawMaterialConsumed),
    directLaborTotal:     Number(latest.directLaborTotal),
    indirectCostsApplied: Number(latest.indirectCostsApplied),
    productionCost:       Number(latest.productionCost),
    costOfGoodsSold:      Number(latest.costOfGoodsSold),
    grossMargin:          Number(latest.grossMargin),
    grossMarginPct:       Number(latest.grossMarginPct),
    detail:               latest.detail,
  };
}
