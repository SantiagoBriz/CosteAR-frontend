import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Check, Calculator, Package, Users, Factory, FileDown } from 'lucide-react';
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
  useExportExcel,
} from './cost-structure-hooks';
import { catedraExample } from './catedra-example';
import { apiErrorMessage } from '@/lib/api';
import type { CalculationResult } from '@/lib/types';

export function CostStructurePage() {
  const { id } = useParams({ from: '/cost-structures/$id' });
  const { data: structure } = useCostStructure(id);
  const updateSection = useUpdateCostSection(id);
  const updateSales = useUpdateSales(id);
  const calculate = useCalculate(id);
  const exportExcel = useExportExcel(id);
  const { data: latest } = useLatestCalculation(id);
  const [result, setResult] = useState<CalculationResult | null>(null);
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
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => exportExcel.mutate()}
              loading={exportExcel.isPending}
            >
              <FileDown className="size-4" /> Exportar a Excel
            </Button>
            <Button onClick={runCalculate} loading={calculate.isPending}>
              <Calculator className="size-4" /> Calcular
            </Button>
          </div>
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

        {/* Resultado */}
        <div>{shown ? <ResultPanel result={shown} /> : <EmptyResult />}</div>
      </div>
    </AppShell>
  );
}

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
