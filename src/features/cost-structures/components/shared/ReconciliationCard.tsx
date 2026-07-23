import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { useLedger } from '@/features/libro/libro-hooks';
import { cn } from '@/lib/utils';

const RECON_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
};

export function ReconciliationCard({ companyId, period, structureCosts }: {
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
