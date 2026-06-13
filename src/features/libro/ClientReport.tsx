import { X, Printer } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import type { LedgerEntry } from './libro-hooks';

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
};
const SECTION_ORDER = ['MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS'];

function periodLabel(p: string): string {
  if (!p) return 'Todos los períodos';
  const [y, m] = p.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${months[Number(m) - 1] ?? m} ${y}`;
}

/**
 * Reporte imprimible para el cliente. Overlay a pantalla completa; con @media
 * print se oculta todo lo demás y solo se imprime el reporte (Guardar como PDF).
 */
export function ClientReport({
  companyName,
  period,
  entries,
  totalsBySection,
  onClose,
}: {
  companyName: string;
  period: string;
  entries: LedgerEntry[];
  totalsBySection: Record<string, number>;
  onClose: () => void;
}) {
  const sections = SECTION_ORDER.filter((s) => totalsBySection[s] != null);
  // Costos = todo menos VENTAS. Ventas se muestra aparte si existe.
  const costSections = sections.filter((s) => s !== 'VENTAS');
  const totalCosts = costSections.reduce((sum, s) => sum + (totalsBySection[s] ?? 0), 0);
  const totalSales = totalsBySection['VENTAS'] ?? 0;
  const margin = totalSales > 0 ? ((totalSales - totalCosts) / totalSales) * 100 : null;
  const docCount = entries.filter((e) => e.dataEntryId).length;
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[70] overflow-auto bg-black/40 print:static print:bg-white">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #client-report, #client-report * { visibility: visible !important; }
          #client-report { position: absolute; inset: 0; margin: 0; box-shadow: none !important; }
          .no-print { display: none !important; }
          @page { margin: 18mm; }
        }
      `}</style>

      <div className="mx-auto my-8 max-w-3xl px-4 print:my-0 print:px-0">
        {/* Barra de acciones (no se imprime) */}
        <div className="no-print mb-3 flex justify-end gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-md bg-granate px-4 py-2 text-sm font-medium text-white hover:bg-granate/90">
            <Printer className="size-4" /> Imprimir / Guardar PDF
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-md border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-surface-alt">
            <X className="size-4" /> Cerrar
          </button>
        </div>

        {/* Documento */}
        <div id="client-report" className="rounded-lg bg-white p-10 shadow-xl print:rounded-none print:p-0 print:shadow-none">
          {/* Encabezado */}
          <div className="mb-8 flex items-start justify-between border-b border-ink/10 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-ink">Reporte de costos</h1>
              <p className="mt-1 text-sm text-ink-soft">{companyName}</p>
              <p className="text-sm text-ink-soft">Período: {periodLabel(period)}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-granate">CosteAR</p>
              <p className="text-[11px] text-ink-soft">Emitido el {today}</p>
            </div>
          </div>

          {/* Resumen de costos */}
          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="pb-2">Elemento del costo</th>
                <th className="pb-2 text-right">Importe</th>
                <th className="pb-2 text-right">% del costo</th>
              </tr>
            </thead>
            <tbody>
              {costSections.map((s) => (
                <tr key={s} className="border-b border-ink/5">
                  <td className="py-2 text-ink">{SECTION_LABELS[s] ?? s}</td>
                  <td className="py-2 text-right tabular-nums text-ink">{formatMoney(totalsBySection[s])}</td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">
                    {totalCosts > 0 ? `${Math.round(((totalsBySection[s] ?? 0) / totalCosts) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink/20 font-bold">
                <td className="py-2 text-ink">Costo total</td>
                <td className="py-2 text-right tabular-nums text-ink">{formatMoney(totalCosts)}</td>
                <td className="py-2 text-right text-ink-soft">100%</td>
              </tr>
            </tbody>
          </table>

          {/* Ventas y margen, si hay */}
          {totalSales > 0 && (
            <div className="mb-6 rounded-md bg-surface-alt p-4 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Ventas del período</span><span className="font-medium tabular-nums text-ink">{formatMoney(totalSales)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Costo total</span><span className="font-medium tabular-nums text-ink">{formatMoney(totalCosts)}</span></div>
              {margin != null && (
                <div className="mt-1 flex justify-between border-t border-ink/10 pt-1"><span className="font-semibold text-ink">Margen bruto</span><span className="font-bold tabular-nums text-granate">{margin.toFixed(1)}%</span></div>
              )}
            </div>
          )}

          {/* Respaldo documental */}
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Este reporte está respaldado por <strong className="text-ink">{docCount}</strong> {docCount === 1 ? 'comprobante validado' : 'comprobantes validados'} y revisados.
            Cada importe es trazable a su documento de origen.
          </p>

          <p className="mt-8 border-t border-ink/10 pt-3 text-[10px] text-ink-soft/60">
            Generado con CosteAR · {today} · Documento de uso profesional
          </p>
        </div>
      </div>
    </div>
  );
}
