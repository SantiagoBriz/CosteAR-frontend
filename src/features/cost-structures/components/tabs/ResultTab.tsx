import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Money, Percent } from '@/components/ui/Money';
import { StatusBadge, marginStatus } from '@/components/ui/StatusBadge';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { ReconciliationCard } from '../shared/ReconciliationCard';
import type { CalculationResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calculator } from 'lucide-react';

export function EmptyResult() {
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

export function ResultTab({ result, companyId, period }: { result: CalculationResult; companyId?: string; period?: string }) {
  const rows = [
    { label: 'Materia Prima consumida', value: result.rawMaterialConsumed },
    { label: 'Mano de Obra Directa',    value: result.directLaborTotal },
    { label: 'CIP aplicados',           value: result.indirectCostsApplied },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
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
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between"><span className="text-ink-soft">IAP — Inasistencias pagas</span><span className="font-medium">{result.detail.directLabor.iapPercent.toFixed(2)}%</span></div>
              {result.detail.directLabor.paidDays != null && (
                <span className="text-[11px] text-ink-soft">
                  IAP = {result.detail.directLabor.paidDays} días pagos / {result.detail.directLabor.workingDays} efectivos = {result.detail.directLabor.iapPercent.toFixed(2)}% · derivado, solo lectura
                </span>
              )}
            </div>
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
