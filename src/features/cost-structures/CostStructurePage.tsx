import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Check, Calculator, Package, Users, Factory, Zap, History } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
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
import { apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { CalculationResult } from '@/lib/types';

type Tab = 'current' | 'simulator' | 'history';

export function CostStructurePage() {
  const { id } = useParams({ from: '/cost-structures/$id' });
  const { data: structure } = useCostStructure(id);
  const updateSection = useUpdateCostSection(id);
  const updateSales = useUpdateSales(id);
  const calculate = useCalculate(id);
  const { data: latest } = useLatestCalculation(id);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [tab, setTab] = useState<Tab>('current');
  const [error, setError] = useState<string | null>(null);

  const loadExample = async (
    section: 'raw-material' | 'direct-labor' | 'indirect-costs',
    config: unknown,
  ) => {
    setError(null);
    try {
      await updateSection.mutateAsync({ section, config });
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const runCalculate = async () => {
    setError(null);
    try {
      const data = await calculate.mutateAsync();
      setResult(data.result);
      setTab('current');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const shown = result ?? (latest ? latestToResult(latest) : null);

  return (
    <AppShell>
      <Link
        to="/companies/$id"
        params={{ id: structure?.companyId ?? '' }}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-granate hover:text-action"
      >
        <ArrowLeft className="size-4" /> Volver a la empresa
      </Link>

      <PageHeader
        title={structure?.productName ?? 'Estructura de costos'}
        description={structure ? `Período ${structure.period}` : undefined}
        action={
          <Button onClick={runCalculate} loading={calculate.isPending}>
            <Calculator className="size-4" /> Calcular
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Configuración de los tres elementos */}
        <div className="space-y-4">
          <SectionCard
            icon={Package}
            title="Materia Prima"
            subtitle="Wilson + ficha de stock PPP"
            configured={!!structure?.rawMaterialConfig}
            onLoad={() => loadExample('raw-material', catedraExample.rawMaterial)}
            loading={updateSection.isPending}
          />
          <SectionCard
            icon={Users}
            title="Mano de Obra Directa"
            subtitle="ITCS + tarifa horaria"
            configured={!!structure?.directLaborConfig}
            onLoad={() => loadExample('direct-labor', catedraExample.directLabor)}
            loading={updateSection.isPending}
          />
          <SectionCard
            icon={Factory}
            title="Costos Indirectos"
            subtitle="Prorrateo + cuotas + variaciones"
            configured={!!structure?.indirectCostConfig}
            onLoad={() => loadExample('indirect-costs', catedraExample.indirectCosts)}
            loading={updateSection.isPending}
          />
          <SalesCard
            defaultPrice={structure?.salesUnitPrice ? Number(structure.salesUnitPrice) : undefined}
            defaultQty={structure?.salesQuantity ? Number(structure.salesQuantity) : undefined}
            onSave={(unitPrice, quantity) =>
              updateSales.mutateAsync({ salesUnitPrice: unitPrice, salesQuantity: quantity })
            }
            saving={updateSales.isPending}
          />
        </div>

        {/* Panel derecho con tabs */}
        <div>
          {/* Tab bar */}
          <div className="mb-4 flex gap-1 border-b border-line">
            <TabBtn active={tab === 'current'} onClick={() => setTab('current')}>
              <Calculator className="size-4" /> Resultado
            </TabBtn>
            <TabBtn active={tab === 'simulator'} onClick={() => setTab('simulator')}>
              <Zap className="size-4" /> Simulador
            </TabBtn>
            <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>
              <History className="size-4" /> Historial
            </TabBtn>
          </div>

          {tab === 'current' && (shown ? <ResultPanel result={shown} /> : <EmptyResult />)}
          {tab === 'simulator' && <SimulatorPanel structureId={id} baseResult={shown} />}
          {tab === 'history' && <HistoryPanel structureId={id} />}
        </div>
      </div>
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 border-b-2 px-4 pb-2.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-granate text-granate'
          : 'border-transparent text-ink-soft hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

// ─── Simulator ──────────────────────────────────────────────────────────────

function SimulatorPanel({
  structureId,
  baseResult,
}: {
  structureId: string;
  baseResult: CalculationResult | null;
}) {
  const simulate = useSimulate(structureId);
  const [simResult, setSimResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<{
    salesUnitPrice: string;
    salesQuantity: string;
    macroFactor: string;
  }>({ defaultValues: { macroFactor: '1' } });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const overrides: Record<string, number> = {};
      if (v.salesUnitPrice) overrides.salesUnitPrice = Number(v.salesUnitPrice);
      if (v.salesQuantity) overrides.salesQuantity = Number(v.salesQuantity);
      if (v.macroFactor && Number(v.macroFactor) !== 1) overrides.macroFactor = Number(v.macroFactor);
      const r = await simulate.mutateAsync(overrides);
      setSimResult(r);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <div className="space-y-4 animate-rise">
      <Card>
        <CardHeader
          title="Simulador what-if"
          description="Modificá el precio de venta, la cantidad o el factor macro y mirá el impacto sin guardar nada."
        />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Precio unitario"
                type="number"
                step="0.01"
                numeric
                placeholder="Dejar vacío = sin cambio"
                {...register('salesUnitPrice')}
              />
              <Input
                label="Cantidad"
                type="number"
                step="1"
                numeric
                placeholder="Dejar vacío = sin cambio"
                {...register('salesQuantity')}
              />
              <Input
                label="Factor macro (ej: 1.15 = +15%)"
                type="number"
                step="0.01"
                numeric
                {...register('macroFactor')}
              />
            </div>
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <Button type="submit" loading={simulate.isPending}>
              <Zap className="size-4" /> Simular
            </Button>
          </form>
        </CardBody>
      </Card>

      {simResult && baseResult && (
        <BeforeAfterCard base={baseResult} simulated={simResult} />
      )}
      {simResult && !baseResult && <ResultPanel result={simResult} />}
    </div>
  );
}

function BeforeAfterCard({
  base,
  simulated,
}: {
  base: CalculationResult;
  simulated: CalculationResult;
}) {
  const delta = simulated.grossMarginPct - base.grossMarginPct;
  const rows = [
    { label: 'Costo de producción', before: base.productionCost, after: simulated.productionCost },
    { label: 'COGS', before: base.costOfGoodsSold, after: simulated.costOfGoodsSold },
    { label: 'Margen bruto ($)', before: base.grossMargin, after: simulated.grossMargin },
  ];

  return (
    <Card>
      <CardHeader
        title="Comparación antes / después"
        description="Resultado base vs. escenario simulado"
        action={
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[13px] font-semibold',
              delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-danger/10 text-danger',
            )}
          >
            Margen: {base.grossMarginPct.toFixed(1)}% → {simulated.grossMarginPct.toFixed(1)}%
            {' '}({delta > 0 ? '+' : ''}{delta.toFixed(1)} pts)
          </span>
        }
      />
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="px-6 py-3 text-left font-medium">Concepto</th>
              <th className="px-4 py-3 text-right font-medium">Base</th>
              <th className="px-4 py-3 text-right font-medium">Simulado</th>
              <th className="px-4 py-3 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const d = r.after - r.before;
              return (
                <tr key={r.label}>
                  <td className="px-6 py-2.5 text-ink-soft">{r.label}</td>
                  <td className="px-4 py-2.5 text-right tabular"><Money value={r.before} /></td>
                  <td className="px-4 py-2.5 text-right tabular font-medium"><Money value={r.after} /></td>
                  <td className={cn('px-4 py-2.5 text-right tabular text-[12px]', d > 0 ? 'text-action' : d < 0 ? 'text-danger' : 'text-ink-soft')}>
                    {d > 0 ? '+' : ''}<Money value={d} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ─── History tab ─────────────────────────────────────────────────────────────

function HistoryPanel({ structureId }: { structureId: string }) {
  const { data: history, isLoading } = useCalculationHistory(structureId);

  if (isLoading) return <p className="text-sm text-ink-soft">Cargando…</p>;
  if (!history?.length) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-sm text-ink-soft">
            Todavía no hay cálculos registrados. Presioná <strong>Calcular</strong> para crear el primero.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Historial de cálculos" description="Últimos 20 snapshots de costos y margen" />
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="px-6 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-right font-medium">Costo prod.</th>
              <th className="px-4 py-3 text-right font-medium">COGS</th>
              <th className="px-4 py-3 text-right font-medium">Margen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((c, i) => (
              <tr key={c.id} className={cn('hover:bg-surface-alt/50', i === 0 && 'bg-action/5')}>
                <td className="px-6 py-2.5 text-ink">
                  {formatDate(c.calculatedAt)}
                  {i === 0 && (
                    <span className="ml-2 rounded-full bg-action/10 px-2 py-0.5 text-[10px] font-semibold text-action">
                      Último
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular"><Money value={Number(c.productionCost)} /></td>
                <td className="px-4 py-2.5 text-right tabular"><Money value={Number(c.costOfGoodsSold)} /></td>
                <td className="px-4 py-2.5 text-right">
                  <Percent value={Number(c.grossMarginPct)} colorize />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  configured,
  onLoad,
  loading,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  configured: boolean;
  onLoad: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-granate-tenue text-granate">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">{title}</div>
            <div className="text-[12px] text-ink-soft">{subtitle}</div>
          </div>
        </div>
        {configured ? (
          <StatusBadge status="ok">
            <Check className="size-3" /> Cargado
          </StatusBadge>
        ) : (
          <Button variant="secondary" size="sm" onClick={onLoad} loading={loading}>
            Cargar ejemplo
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

function SalesCard({
  defaultPrice,
  defaultQty,
  onSave,
  saving,
}: {
  defaultPrice?: number;
  defaultQty?: number;
  onSave: (unitPrice: number, quantity: number) => Promise<unknown>;
  saving: boolean;
}) {
  const { register, handleSubmit } = useForm<{ unitPrice: number; quantity: number }>();
  return (
    <Card>
      <CardHeader title="Datos de venta" description="Para el cálculo del margen" />
      <CardBody>
        <form
          onSubmit={handleSubmit((v) => onSave(Number(v.unitPrice), Number(v.quantity)))}
          className="space-y-3"
        >
          <Input label="Precio unitario" type="number" step="0.01" numeric defaultValue={defaultPrice} {...register('unitPrice', { required: true })} />
          <Input label="Cantidad" type="number" step="1" numeric defaultValue={defaultQty} {...register('quantity', { required: true })} />
          <Button type="submit" size="sm" className="w-full" loading={saving}>
            Guardar venta
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function ResultPanel({ result }: { result: CalculationResult }) {
  const rows = [
    { label: 'Materia Prima consumida', value: result.rawMaterialConsumed },
    { label: 'Mano de Obra Directa', value: result.directLaborTotal },
    { label: 'CIP aplicados', value: result.indirectCostsApplied },
  ];

  return (
    <div className="space-y-4 animate-rise">
      {/* Margen — el indicador estrella */}
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-ink-soft">Margen bruto</div>
            <div className="mt-1 flex items-baseline gap-3">
              <Percent value={result.grossMarginPct} colorize className="text-3xl font-bold" />
              <Money value={result.grossMargin} className="text-sm text-ink-soft" />
            </div>
          </div>
          <StatusBadge status={marginStatus(result.grossMarginPct, 15)}>
            {result.grossMarginPct < 0
              ? 'Venta a pérdida'
              : result.grossMarginPct < 15
                ? 'Margen ajustado'
                : 'Margen sano'}
          </StatusBadge>
        </CardBody>
      </Card>

      {/* Estado de costos */}
      <Card>
        <CardHeader title="Estado de costos" description="Camino hasta el costo de los productos vendidos" />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-6 py-2.5 text-ink-soft">{r.label}</td>
                  <td className="px-6 py-2.5 text-right">
                    <Money value={r.value} />
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-alt font-semibold">
                <td className="px-6 py-2.5 text-ink">Costo de producción</td>
                <td className="px-6 py-2.5 text-right">
                  <Money value={result.productionCost} />
                </td>
              </tr>
              <tr className="bg-granate-tenue font-semibold">
                <td className="px-6 py-3 text-granate">Costo de productos vendidos</td>
                <td className="px-6 py-3 text-right">
                  <Money value={result.costOfGoodsSold} className="text-granate" />
                </td>
              </tr>
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Detalle por departamento */}
      <Card>
        <CardHeader title="Análisis de variaciones (CIP)" />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-granate text-left text-[12px] uppercase tracking-wide text-white">
                <th className="px-6 py-2.5 font-medium">Departamento</th>
                <th className="px-6 py-2.5 text-right font-medium">Aplicado</th>
                <th className="px-6 py-2.5 text-right font-medium">Var. Presup.</th>
                <th className="px-6 py-2.5 text-right font-medium">Var. Volumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.entries(result.detail.indirectCosts.perDepartment).map(([dept, d]) => (
                <tr key={dept}>
                  <td className="px-6 py-2.5 text-ink">{dept}</td>
                  <td className="px-6 py-2.5 text-right">
                    <Money value={d.appliedCip} />
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <Money value={d.budgetVariance} />
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <Money value={d.volumeVariance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function EmptyResult() {
  return (
    <Card className="flex h-full items-center justify-center">
      <CardBody className="py-20 text-center">
        <Calculator className="mx-auto size-10 text-idle" />
        <p className="mt-3 text-sm text-ink-soft">
          Cargá los tres elementos del costo y presioná <strong>Calcular</strong> para ver el
          estado de costos y el margen.
        </p>
      </CardBody>
    </Card>
  );
}

function latestToResult(latest: NonNullable<ReturnType<typeof useLatestCalculation>['data']>): CalculationResult {
  return {
    rawMaterialConsumed: Number(latest.rawMaterialConsumed),
    directLaborTotal: Number(latest.directLaborTotal),
    indirectCostsApplied: Number(latest.indirectCostsApplied),
    productionCost: Number(latest.productionCost),
    costOfGoodsSold: Number(latest.costOfGoodsSold),
    grossMargin: Number(latest.grossMargin),
    grossMarginPct: Number(latest.grossMarginPct),
    detail: latest.detail,
  };
}
