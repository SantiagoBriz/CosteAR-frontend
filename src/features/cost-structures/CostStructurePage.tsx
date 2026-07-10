import { useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, Calculator, Package, Users, Factory,
  TrendingUp, BarChart2, CheckCircle2, History,
  Download, Loader2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge, marginStatus } from '@/components/ui/StatusBadge';
import { Money, Percent } from '@/components/ui/Money';
import {
  useCostStructure,
  useUpdateCostSection,
  useUpdateSales,
  useCalculate,
  useLatestCalculation,
  useCalculationHistory,
  useExportExcel,
} from './cost-structure-hooks';
import { useLedger } from '@/features/libro/libro-hooks';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { RawMaterialForm } from './RawMaterialForm';
import { DirectLaborForm } from './DirectLaborForm';
import { IndirectCostsForm } from './IndirectCostsForm';
import type { RawMaterialConfig, DirectLaborConfig, IndirectCostConfig } from './cost-structure-types';
import { apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { CalculationResult } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionTab = 'raw-material' | 'direct-labor' | 'indirect-costs' | 'sales' | 'result' | 'history';

// ── Page ──────────────────────────────────────────────────────────────────────

export function CostStructurePage() {
  const { id } = useParams({ from: '/cost-structures/$id' });
  const { data: structure, isLoading } = useCostStructure(id);
  const updateSection = useUpdateCostSection(id);
  const updateSales   = useUpdateSales(id);
  const calculate     = useCalculate(id);
  const exportExcel   = useExportExcel(id);
  const { data: latest } = useLatestCalculation(id);

  const [activeTab, setActiveTab] = useState<SectionTab>('raw-material');
  const [result,    setResult]    = useState<{ result: CalculationResult; calculationId: string } | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const configured = {
    mp:    !!structure?.rawMaterialConfig,
    mod:   !!structure?.directLaborConfig,
    cip:   !!structure?.indirectCostConfig,
    sales: !!(structure?.salesUnitPrice && structure?.salesQuantity),
  };
  const allReady = configured.mp && configured.mod && configured.cip && configured.sales;
  const shown    = result ?? (latest ? { result: latestToResult(latest), calculationId: latest.id } : null);

  const saveSection = async (
    section: 'raw-material' | 'direct-labor' | 'indirect-costs',
    config: unknown,
  ) => {
    setError(null);
    try {
      await updateSection.mutateAsync({ section, config });
      // No se auto-avanza a la siguiente sección: el usuario se queda en la
      // pestaña actual para seguir revisando lo que cargó.
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  const runCalculate = async () => {
    setError(null);
    try {
      const data = await calculate.mutateAsync();
      setResult(data);
      setActiveTab('result');
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  const runExport = async () => {
    setError(null);
    try {
      await exportExcel.mutateAsync();
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
    <AppShell wide>
      <FullScreenCalculatorLoader active={calculate.isPending} />
      {/* Header */}
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:justify-between">
        <div>
          <Link
            to="/companies/$id"
            params={{ id: structure?.companyId ?? '' }}
            className="mb-1.5 flex items-center gap-1 text-[13px] text-granate hover:text-action"
          >
            <ArrowLeft className="size-3.5" /> Volver a la empresa
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-granate-deep">{structure?.productName ?? 'Estructura de costos'}</h1>
          <p className="text-sm text-ink-soft">Período {structure?.period}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={runExport} loading={exportExcel.isPending} disabled={!allReady}>
            <Download className="size-4" /> Exportar
          </Button>
          <Button onClick={runCalculate} loading={calculate.isPending} disabled={!allReady}>
            <Calculator className="size-4" /> Calcular
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-danger/60 hover:text-danger">✕</button>
        </div>
      )}

      {/* Aviso de progreso */}
      {!allReady && (
        <div className="mb-4 rounded-xl border border-action/20 bg-action/5 px-4 py-2.5 text-[13px] text-ink">
          Completá las 4 secciones para habilitar el cálculo.
        </div>
      )}

      {/* Tab bar — con gap entre pestañas para evitar errar de botón al cargar datos */}
      <div className="mb-8 flex gap-4 overflow-x-auto border-b border-line">
        {(
          [
            { id: 'raw-material'    as SectionTab, label: 'Materia Prima',        icon: Package,    configKey: 'mp'    as const },
            { id: 'direct-labor'    as SectionTab, label: 'Mano de Obra',          icon: Users,      configKey: 'mod'   as const },
            { id: 'indirect-costs'  as SectionTab, label: 'Costos Indirectos',     icon: Factory,    configKey: 'cip'   as const },
            { id: 'sales'           as SectionTab, label: 'Venta',                 icon: TrendingUp, configKey: 'sales' as const },
            { id: 'result'          as SectionTab, label: 'Resultado',             icon: BarChart2,  configKey: undefined },
            { id: 'history'         as SectionTab, label: 'Historial',             icon: History,    configKey: undefined },
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

      {/* Tab content — los 4 formularios de carga se mantienen MONTADOS (solo se
          ocultan con `hidden`). Así lo que cargues sin guardar queda como borrador
          al cambiar de pestaña y sigue ahí al volver. */}
      <div className={cn(activeTab !== 'raw-material' && 'hidden')}>
        <SectionShell
          title="Materia Prima"
          description="Lote óptimo de Wilson · Política de stock · Ficha PPP (Precio Promedio Ponderado)"
          configured={configured.mp}
        >
          <RawMaterialForm
            defaultValues={structure?.rawMaterialConfig as RawMaterialConfig | undefined}
            onSave={(d) => saveSection('raw-material', d)}
            saving={updateSection.isPending}
            isProcesses={structure?.costingSystem === 'PROCESSES'}
            period={structure?.period}
          />
        </SectionShell>
      </div>

      <div className={cn(activeTab !== 'direct-labor' && 'hidden')}>
        <SectionShell
          title="Mano de Obra Directa"
          description="Días hábiles efectivos · ITCS (Índice Total de Cargas Sociales) · Tarifa horaria por departamento"
          configured={configured.mod}
        >
          <DirectLaborForm
            defaultValues={structure?.directLaborConfig as DirectLaborConfig | undefined}
            onSave={(d) => saveSection('direct-labor', d)}
            saving={updateSection.isPending}
          />
        </SectionShell>
      </div>

      <div className={cn(activeTab !== 'indirect-costs' && 'hidden')}>
        <SectionShell
          title="Costos Indirectos de Producción"
          description="Centros de costo · Prorrateo primario y secundario · Cuotas por hora y variaciones"
          configured={configured.cip}
        >
          <IndirectCostsForm
            defaultValues={structure?.indirectCostConfig as IndirectCostConfig | undefined}
            onSave={(d) => saveSection('indirect-costs', d)}
            saving={updateSection.isPending}
          />
        </SectionShell>
      </div>

      <div className={cn(activeTab !== 'sales' && 'hidden')}>
        <SalesTab
          defaultPrice={structure?.salesUnitPrice ? Number(structure.salesUnitPrice) : undefined}
          defaultQty={structure?.salesQuantity ? Number(structure.salesQuantity) : undefined}
          onSave={async (p, q) => {
            setError(null);
            try {
              await updateSales.mutateAsync({ salesUnitPrice: p, salesQuantity: q });
              // Se queda en Venta tras guardar (no salta a Resultado).
            } catch (e) { setError(apiErrorMessage(e)); }
          }}
          saving={updateSales.isPending}
          allReady={allReady}
          onCalculate={runCalculate}
          calculating={calculate.isPending}
        />
      </div>

      {activeTab === 'result' && (
        shown
          ? <ResultPanel result={shown.result} runId={shown.calculationId} structureId={id} companyId={structure?.companyId} period={structure?.period} />
          : <EmptyResult />
      )}

      {activeTab === 'history' && (
        <HistoryPanel structureId={id} />
      )}
    </AppShell>
  );
}

// ── SectionShell ──────────────────────────────────────────────────────────────

function SectionShell({
  title, description, configured, children,
}: {
  title: string;
  description: string;
  configured: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          configured ? (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-ok">
              <CheckCircle2 className="size-3.5" /> Guardado
            </span>
          ) : undefined
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
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<{ unitPrice: any; quantity: any }>({
    defaultValues: {
      unitPrice: defaultPrice === 0 ? '' : (defaultPrice ?? ''),
      quantity: defaultQty === 0 ? '' : (defaultQty ?? ''),
    },
  });

  useEffect(() => {
    reset({
      unitPrice: defaultPrice === 0 ? '' : (defaultPrice ?? ''),
      quantity: defaultQty === 0 ? '' : (defaultQty ?? ''),
    });
  }, [defaultPrice, defaultQty, reset]);

  const [pending, setPending] = useState<{ p: number; q: number } | null>(null);

  const onSubmit = (v: any) => {
    const fallbackNum = (val: any) => {
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
      return Number(val);
    };
    setPending({ p: fallbackNum(v.unitPrice), q: fallbackNum(v.quantity) });
  };

  return (
    <Card>
      <CardHeader
        title="Datos de venta"
        description="Precio unitario y cantidad producida para calcular el margen bruto"
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4">
          <Input label="Precio de venta unitario $" type="number" step="0.01" numeric
            placeholder="Ej: 25000" info="Precio al que vendés una unidad del producto. En pesos."
            {...register('unitPrice', { required: true })} />
          <Input label="Cantidad producida / vendida" type="number" step="1" numeric
            placeholder="Ej: 100" info="Unidades producidas/vendidas en el período. Número entero."
            {...register('quantity', { required: true })} />
          {isDirty && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-warn">
              <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
            </p>
          )}
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

      <ConfirmDialog
        open={!!pending}
        title="Actualizar Venta"
        message="¿Querés actualizar los datos de Venta?"
        confirmLabel="Guardar"
        loading={saving}
        onConfirm={async () => {
          if (!pending) return;
          await onSave(pending.p, pending.q);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}

function FullScreenCalculatorLoader({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const steps = [
    { pct: 10, msg: "Obteniendo datos de la estructura..." },
    { pct: 30, msg: "Calculando consumos de materia prima por ficha PPP..." },
    { pct: 55, msg: "Procesando días hábiles efectivos y cargas sociales MOD..." },
    { pct: 75, msg: "Ejecutando distribución primaria y secundaria dual de CIP..." },
    { pct: 90, msg: "Analizando variaciones presupuestarias y de volumen..." },
    { pct: 98, msg: "Generando reporte de costos finales..." }
  ];

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 850);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const current = steps[step]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6 text-white animate-fade-in">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="relative flex justify-center">
          <div className="absolute inset-0 size-16 rounded-full bg-granate/20 blur-xl animate-pulse mx-auto" />
          <Loader2 className="size-16 animate-spin text-granate relative" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold tracking-tight">Ejecutando Cálculo de Costos</h3>
          <p className="text-sm text-zinc-400 min-h-[40px] px-4 leading-relaxed transition-all duration-300">
            {current.msg}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
            <div
              className="h-full bg-granate transition-all duration-500 ease-out rounded-full"
              style={{ width: `${current.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-zinc-500 font-mono">
            <span>PROGRESO</span>
            <span>{current.pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────

import { DerivationTree } from './components/DerivationTree';

function ResultPanel({ result, runId, structureId, companyId, period }: { result: CalculationResult; runId: string; structureId: string; companyId?: string; period?: string }) {
  const rows = [
    { label: 'Materia Prima consumida', value: result.rawMaterialConsumed },
    { label: 'Mano de Obra Directa',    value: result.directLaborTotal },
    { label: 'CIP aplicados',           value: result.indirectCostsApplied },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {/* Izquierda: tablas */}
      <div className="space-y-4">
        <AdvisorPanel
          kind="cost_result"
          label="Analizar el resultado"
          context={{
            materiaPrima: result.rawMaterialConsumed,
            manoDeObra: result.directLaborTotal,
            costosIndirectos: result.indirectCostsApplied,
            costoProduccion: result.productionCost,
            cogs: result.costOfGoodsSold,
            margenBruto: result.grossMargin,
            margenBrutoPct: result.grossMarginPct,
          }}
        />
        {companyId && period && (
          <ReconciliationCard
            companyId={companyId}
            period={period}
            structureCosts={{
              MATERIA_PRIMA: result.rawMaterialConsumed,
              MANO_DE_OBRA: result.directLaborTotal,
              COSTOS_INDIRECTOS: result.indirectCostsApplied,
            }}
          />
        )}
        <Card>
          <CardHeader title="Desglose de costos" />
          <CardBody className="overflow-x-auto p-0">
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

        <DerivationTree structureId={structureId} runId={runId} />

        {Object.keys(result.detail.indirectCosts.perDepartment).length > 0 && (
          <Card>
            <CardHeader title="Análisis de variaciones — CIP" description="Detalle de base, cuota, aplicación y variaciones de costos indirectos" />
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-line bg-surface-alt uppercase tracking-wider text-ink-soft text-[10px]">
                    <th className="px-4 py-3 text-left font-semibold">Dpto / Centro</th>
                    <th className="px-4 py-3 text-right font-semibold">CIP Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Base Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Cuota Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Base Real</th>
                    <th className="px-4 py-3 text-right font-semibold">CIP Aplicado</th>
                    <th className="px-4 py-3 text-right font-semibold">CIP Real</th>
                    <th className="px-4 py-3 text-right font-semibold">Var. Presup.</th>
                    <th className="px-4 py-3 text-right font-semibold">Var. Volumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(result.detail.indirectCosts.perDepartment).map(([dept, d]) => {
                    const normalCapacity = d.normalCapacity ?? 0;
                    const quota = d.quota ?? 0;
                    const budgetedCip = normalCapacity * quota;
                    return (
                      <tr key={dept} className="hover:bg-surface-alt/45">
                        <td className="px-4 py-3 font-semibold text-ink">{dept}</td>
                        <td className="px-4 py-3 text-right"><Money value={budgetedCip} /></td>
                        <td className="px-4 py-3 text-right font-mono">{normalCapacity} hs</td>
                        <td className="px-4 py-3 text-right"><Money value={quota} /></td>
                        <td className="px-4 py-3 text-right font-mono">{d.actualActivity ?? 0} hs</td>
                        <td className="px-4 py-3 text-right font-bold text-ink"><Money value={d.appliedCip} /></td>
                        <td className="px-4 py-3 text-right font-bold text-ink"><Money value={d.actualCip ?? d.cipTotal} /></td>
                        <td className={cn('px-4 py-3 text-right font-medium', d.budgetVariance < 0 ? 'text-danger' : 'text-ok')}>
                          <Money value={d.budgetVariance} />
                        </td>
                        <td className={cn('px-4 py-3 text-right font-medium', d.volumeVariance < 0 ? 'text-danger' : 'text-ok')}>
                          <Money value={d.volumeVariance} />
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
            <div className="flex justify-between"><span className="text-ink-soft">IAP (Índice de Ausentismo Pago)</span><span className="font-medium">{result.detail.directLabor.iapPercent.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">ITCS</span><span className="font-medium">{result.detail.directLabor.itcsPercent.toFixed(2)}%</span></div>
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
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
              {['Fecha','Costo prod.','COGS','Margen'].map((h, i) => (
                <th key={h} className={cn('px-6 py-3 font-semibold', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((c: any, i) => (
              <tr key={c.id} className={cn('hover:bg-surface-alt/50', i === 0 && 'bg-action/5')}>
                <td className="px-6 py-3 text-ink">
                  {formatDate(c.executedAt)}
                  {i === 0 && <span className="ml-2 rounded-full bg-action/10 px-2 py-0.5 text-[10px] font-semibold text-action">Último</span>}
                </td>
                <td className="px-6 py-3 text-right"><Money value={Number(c.results.productionCost)} /></td>
                <td className="px-6 py-3 text-right"><Money value={Number(c.results.costOfGoodsSold)} /></td>
                <td className="px-6 py-3 text-right"><Percent value={Number(c.results.grossMarginPct)} colorize /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function latestToResult(latest: any): CalculationResult {
  return latest.results;
}

// ── Reconciliación: estructura vs documentos (libro de costos) ──────────────────

const RECON_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
};

/**
 * Compara, sin tocar el modelo, lo que dice la estructura calculada contra los
 * costos reales del libro mayor (documentos aprobados) para el mismo período.
 * Le permite al costista detectar desvíos: "presupuestaste MP en $X pero tus
 * comprobantes suman $Y". Es read-only: reconcilia a ojo, no auto-inyecta.
 */
function ReconciliationCard({ companyId, period, structureCosts }: {
  companyId: string;
  period: string;
  structureCosts: Record<string, number>;
}) {
  const { data, isLoading } = useLedger(companyId, period);
  const totals = data?.totalsBySection ?? {};
  const hasLedger = Object.keys(RECON_LABELS).some((s) => totals[s] != null);

  if (isLoading || !hasLedger) return null;

  return (
    <Card>
      <CardHeader
        title="Reconciliación con documentos"
        description={`Tu estructura vs lo que suman los comprobantes aprobados del período ${period}`}
      />
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-6 py-3 text-left font-semibold">Elemento</th>
              <th className="px-6 py-3 text-right font-semibold">Según estructura</th>
              <th className="px-6 py-3 text-right font-semibold">Según documentos</th>
              <th className="px-6 py-3 text-right font-semibold">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(RECON_LABELS).map(([section, label]) => {
              const structureVal = structureCosts[section] ?? 0;
              const ledgerVal = totals[section];
              if (ledgerVal == null) {
                return (
                  <tr key={section} className="hover:bg-surface-alt/40">
                    <td className="px-6 py-3 text-ink-soft">{label}</td>
                    <td className="px-6 py-3 text-right"><Money value={structureVal} /></td>
                    <td className="px-6 py-3 text-right text-ink-soft/50">sin documentos</td>
                    <td className="px-6 py-3 text-right text-ink-soft/50">—</td>
                  </tr>
                );
              }
              const diff = structureVal - ledgerVal;
              const pct = ledgerVal > 0 ? (diff / ledgerVal) * 100 : null;
              const big = pct != null && Math.abs(pct) >= 10;
              return (
                <tr key={section} className="hover:bg-surface-alt/40">
                  <td className="px-6 py-3 text-ink-soft">{label}</td>
                  <td className="px-6 py-3 text-right"><Money value={structureVal} /></td>
                  <td className="px-6 py-3 text-right"><Money value={ledgerVal} /></td>
                  <td className={cn('px-6 py-3 text-right tabular-nums font-medium', big ? 'text-amber-600' : 'text-ink-soft')}>
                    {diff >= 0 ? '+' : ''}{pct != null ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-6 py-3">
          <p className="mb-2 text-[11px] text-ink-soft/70">
            Una diferencia grande (≥10%) sugiere revisar: o la estructura quedó desactualizada, o faltan/sobran comprobantes cargados.
          </p>
          <AdvisorPanel
            kind="reconciliation"
            label="Explicar los desvíos"
            context={{
              structureCosts,
              ledgerCosts: {
                MATERIA_PRIMA: totals['MATERIA_PRIMA'] ?? null,
                MANO_DE_OBRA: totals['MANO_DE_OBRA'] ?? null,
                COSTOS_INDIRECTOS: totals['COSTOS_INDIRECTOS'] ?? null,
              },
              period,
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}
