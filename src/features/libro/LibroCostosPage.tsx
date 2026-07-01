import { useState } from 'react';
import { BookOpen, ImageIcon, Bot, PenLine, FileText, FileDown, Plus, Pencil, Trash2, Table } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatMoney, formatDate } from '@/lib/utils';
import { useCompanies } from '@/features/companies/company-hooks';
import { useLedger, useDeleteLedgerEntry, type LedgerEntry } from './libro-hooks';
import { ClientReport } from './ClientReport';
import { LedgerEntryModal } from './LedgerEntryModal';

const SECTION_LABELS_FULL: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
};

/** Exporta las líneas a CSV (Excel) — los costistas viven en Excel. */
function exportCsv(entries: LedgerEntry[], companyName: string) {
  const headers = ['Periodo', 'Fecha', 'Seccion', 'Tipo', 'Proveedor', 'Descripcion', 'Monto', 'Moneda', 'Confianza', 'Auto', 'Corregido'];
  const rows = entries.map((e) => [
    e.period,
    e.docDate ? new Date(e.docDate).toLocaleDateString('es-AR') : '',
    SECTION_LABELS_FULL[e.costSection] ?? e.costSection,
    e.documentType,
    e.supplier ?? '',
    e.description.replace(/"/g, '""'),
    String(e.amount),
    e.currency,
    e.confidence != null ? `${e.confidence}%` : '',
    e.aiUsed ? 'si' : 'no',
    e.wasCorrected ? 'si' : 'no',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `libro-costos-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
};

const SECTION_ORDER = ['MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS'];

function periodLabel(p: string): string {
  const [y, m] = p.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${months[Number(m) - 1] ?? m} ${y}`;
}

export function LibroCostosPage() {
  const { data: companies = [] } = useCompanies();
  const [companyId, setCompanyId] = useState<string>('');
  const [period, setPeriod] = useState<string>('');
  const { data, isLoading } = useLedger(companyId || undefined, period || undefined);
  const del = useDeleteLedgerEntry();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const selectedCompanyName = companies.find((c) => c.id === companyId)?.name ?? 'Todas las empresas';

  const handleDelete = async (e: LedgerEntry) => {
    if (window.confirm(`¿Borrar "${e.description}" (${formatMoney(e.amount)})? Esto no se puede deshacer.`)) {
      await del.mutateAsync(e.id);
    }
  };

  const entries = data?.entries ?? [];
  const grouped = SECTION_ORDER
    .map((s) => ({ section: s, items: entries.filter((e) => e.costSection === s) }))
    .filter((g) => g.items.length > 0);

  return (
    <AppShell>
      <PageHeader
        title="Libro de costos"
        description="Costos reales respaldados por los documentos que aprobaste. Cada número es trazable a su comprobante."
      />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        >
          <option value="">Todas mis empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="">Todos los períodos</option>
          {(data?.periods ?? []).map((p) => (
            <option key={p} value={p}>{periodLabel(p)}</option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)} title={companyId ? '' : 'Elegí una empresa para cargar manual'}>
            <Plus className="size-4" /> Agregar manual
          </Button>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => exportCsv(entries, selectedCompanyName)}>
              <Table className="size-4" /> Excel (CSV)
            </Button>
          )}
          {entries.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShowReport(true)}>
              <FileDown className="size-4" /> Reporte para el cliente
            </Button>
          )}
        </div>
      </div>

      {/* Totales por sección */}
      {data && Object.keys(data.totalsBySection).length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTION_ORDER.filter((s) => data.totalsBySection[s] != null).map((s) => (
            <div key={s} className="rounded-lg border border-line bg-surface p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-soft">{SECTION_LABELS[s]}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-ink">{formatMoney(data.totalsBySection[s])}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 size-8 text-ink-soft/40" />
            <p className="text-sm font-medium text-ink">Todavía no hay costos cargados</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Cuando apruebes documentos en Validaciones, sus montos aparecen acá automáticamente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ section, items }) => (
            <Card key={section}>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <p className="text-[15px] font-semibold text-ink">{SECTION_LABELS[section] ?? section}</p>
                <span className="text-[13px] font-semibold tabular-nums text-granate">
                  {formatMoney(items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-line">
                {items.map((e) => (
                  <LedgerRow key={e.id} entry={e} onZoom={setLightbox} onEdit={setEditing} onDelete={handleDelete} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(adding || editing) && (
        <LedgerEntryModal
          entry={editing ?? undefined}
          companyId={companyId || undefined}
          defaultPeriod={period || undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}

      {showReport && data && (
        <ClientReport
          companyName={selectedCompanyName}
          period={period}
          entries={entries}
          totalsBySection={data.totalsBySection}
          onClose={() => setShowReport(false)}
        />
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Comprobante" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(ev) => ev.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 size-9 rounded-full bg-black/50 text-lg text-white hover:bg-black/70">✕</button>
        </div>
      )}
    </AppShell>
  );
}

function LedgerRow({ entry, onZoom, onEdit, onDelete }: {
  entry: LedgerEntry;
  onZoom: (src: string) => void;
  onEdit: (e: LedgerEntry) => void;
  onDelete: (e: LedgerEntry) => void;
}) {
  const isImage = entry.sourceImageUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(entry.sourceImageUrl);
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {/* Origen: miniatura o ícono, clickeable */}
      {entry.sourceImageUrl ? (
        isImage ? (
          <button type="button" onClick={() => onZoom(entry.sourceImageUrl!)} className="shrink-0">
            <img src={entry.sourceImageUrl} alt="comprobante" className="size-10 rounded object-cover border border-line hover:opacity-80" />
          </button>
        ) : (
          <a href={entry.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded border border-line bg-surface-alt text-ink-soft hover:bg-surface">
            <FileText className="size-4" />
          </a>
        )
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded border border-line bg-surface-alt text-ink-soft/40">
          <ImageIcon className="size-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{entry.description}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span>{entry.docDate ? formatDate(entry.docDate) : periodLabel(entry.period)}</span>
          {entry.wasCorrected && (
            <span className="flex items-center gap-0.5 rounded bg-blue-50 px-1 text-blue-700"><PenLine className="size-3" /> corregido</span>
          )}
          {entry.aiUsed && (
            <span className="flex items-center gap-0.5 rounded bg-purple-50 px-1 text-purple-700"><Bot className="size-3" /> Auto</span>
          )}
          {entry.confidence != null && entry.confidence < 72 && (
            <span className="rounded bg-amber-50 px-1 text-amber-700">conf. {entry.confidence}%</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[14px] font-semibold tabular-nums text-ink">
          {entry.currency !== 'ARS' && <span className="text-[11px] text-ink-soft">{entry.currency} </span>}
          {formatMoney(entry.amount)}
        </p>
      </div>

      {/* Editar / borrar */}
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onEdit(entry)} title="Editar" className="rounded p-1.5 text-ink-soft hover:bg-surface-alt hover:text-ink">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={() => onDelete(entry)} title="Borrar" className="rounded p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
