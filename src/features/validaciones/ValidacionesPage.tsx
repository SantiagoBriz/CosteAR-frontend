import { useState } from 'react';
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, PenLine,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Building2, FileText, Image, AlertTriangle, Bot,
} from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { usePendingEntries, useReviewEntry, type DataEntry } from './validaciones-hooks';
import { formatDate } from '@/lib/utils';

const SOURCE_LABELS: Record<string, string> = {
  TEXT: 'Texto',
  PDF: 'PDF',
  IMAGE: 'Imagen',
  WHATSAPP: 'WhatsApp',
};

// Intentar parsear el reviewNote como análisis de IA
interface AIAnalysis {
  documentType?: string;
  quality?: string;
  qualityNote?: string;
  costSection?: string;
  message?: string;
  extractedData?: Record<string, unknown>;
}

function parseAIAnalysis(reviewNote: string | null): AIAnalysis | null {
  if (!reviewNote) return null;
  try {
    const parsed = JSON.parse(reviewNote);
    if (parsed && typeof parsed === 'object' && (parsed.documentType || parsed.message)) {
      return parsed as AIAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  factura_compra: 'Factura de compra',
  factura_venta: 'Factura de venta',
  remito: 'Remito',
  liquidacion_sueldos: 'Liquidación de sueldos',
  planilla_horas: 'Planilla de horas',
  nota_debito: 'Nota de débito',
  recibo: 'Recibo',
  otro: 'Otro documento',
  FACTURA_COMPRA: 'Factura de compra',
  FACTURA_VENTA: 'Factura de venta',
  REMITO: 'Remito',
  LIQUIDACION_MOD: 'Liquidación de sueldos',
  PLANILLA_HORAS: 'Planilla de horas',
  NOTA_DEBITO: 'Nota de débito',
  NOTA_CREDITO: 'Nota de crédito',
  DESCONOCIDO: 'Sin clasificar',
};

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: 'Materia Prima',
  MANO_DE_OBRA: 'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS: 'Ventas',
  DESCONOCIDO: 'Sin clasificar',
};

function fmt(n?: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function ValidacionesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePendingEntries(page);
  const review = useReviewEntry();

  const [reviewing, setReviewing] = useState<{ entry: DataEntry; action: 'APPROVED' | 'REJECTED' | 'CORRECTED' } | null>(null);
  const [note, setNote] = useState('');
  const [correctedContent, setCorrectedContent] = useState('');

  const handleReview = async (status: 'APPROVED' | 'REJECTED' | 'CORRECTED') => {
    if (!reviewing) return;
    await review.mutateAsync({
      entryId: reviewing.entry.id,
      status,
      note: note || undefined,
      correctedContent: status === 'CORRECTED' ? correctedContent : undefined,
    });
    setReviewing(null);
    setNote('');
    setCorrectedContent('');
  };

  // Agrupar por empresa
  const byCompany = (data?.items ?? []).reduce<Map<string, { name: string; industry: string | null; entries: DataEntry[] }>>(
    (map, entry) => {
      const { id, name, industry } = entry.connection.company;
      if (!map.has(id)) map.set(id, { name, industry, entries: [] });
      map.get(id)!.entries.push(entry);
      return map;
    },
    new Map(),
  );

  return (
    <AppShell>
      <PageHeader
        title="Validaciones"
        description="Revisá los datos enviados por tus clientes antes de aplicarlos"
      />

      {/* Modal de revisión */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-xl animate-rise">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-ink">Revisar entrada</h3>
              <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[12px] text-ink-soft">
                {reviewing.entry.connection.company.name}
              </span>
            </div>

            {/* Preview del archivo si lo hay */}
            {reviewing.entry.fileData && reviewing.entry.fileMimeType?.startsWith('image/') && (
              <img
                src={`data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`}
                alt={reviewing.entry.fileName ?? 'documento'}
                className="mb-4 w-full rounded-md object-contain max-h-64 border border-line bg-surface-alt"
              />
            )}
            {reviewing.entry.fileData && reviewing.entry.fileMimeType === 'application/pdf' && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-line bg-surface-alt p-3">
                <FileText className="size-5 text-ink-soft" />
                <span className="text-[13px] text-ink">{reviewing.entry.fileName}</span>
              </div>
            )}

            <div className="mb-4 rounded-md bg-surface-alt p-3 text-sm text-ink whitespace-pre-wrap">
              {reviewing.entry.rawContent}
            </div>

            {reviewing.action === 'CORRECTED' && (
              <div className="mb-4">
                <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                  Contenido corregido
                </label>
                <textarea
                  className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none min-h-[80px]"
                  placeholder="Escribí la versión corregida del dato…"
                  value={correctedContent}
                  onChange={(e) => setCorrectedContent(e.target.value)}
                />
              </div>
            )}

            <div className="mb-5">
              <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                Nota (opcional)
              </label>
              <input
                type="text"
                className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none"
                placeholder="Ej: actualizado en estructura de costos de Oct 2025"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReviewing(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleReview(reviewing.action)}
                loading={review.isPending}
                className={cn(
                  reviewing.action === 'APPROVED' && 'bg-green-600 hover:bg-green-700',
                  reviewing.action === 'REJECTED' && 'bg-danger hover:bg-danger/90',
                  reviewing.action === 'CORRECTED' && 'bg-action hover:bg-action/90',
                )}
              >
                {reviewing.action === 'APPROVED' && 'Confirmar aprobación'}
                {reviewing.action === 'REJECTED' && 'Confirmar rechazo'}
                {reviewing.action === 'CORRECTED' && 'Guardar corrección'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-sm text-ink-soft">Cargando…</div>
      ) : !data?.items.length ? (
        <Card>
          <CardBody className="py-16 text-center">
            <ClipboardCheck className="mx-auto mb-3 size-10 text-ink-soft/40" />
            <p className="text-sm font-medium text-ink">Todo al día</p>
            <p className="mt-1 text-[13px] text-ink-soft">No hay datos pendientes de validación.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-action/10 px-3 py-1 text-[13px] font-semibold text-action">
              {data.total} pendientes
            </span>
            <span className="text-[13px] text-ink-soft">en {byCompany.size} {byCompany.size === 1 ? 'empresa' : 'empresas'}</span>
          </div>

          {/* Sección por empresa */}
          <div className="space-y-4">
            {[...byCompany.entries()].map(([companyId, { name, industry, entries }]) => (
              <CompanySection
                key={companyId}
                companyName={name}
                industry={industry}
                entries={entries}
                onApprove={(entry) => setReviewing({ entry, action: 'APPROVED' })}
                onReject={(entry) => setReviewing({ entry, action: 'REJECTED' })}
                onCorrect={(entry) => {
                  setCorrectedContent(entry.rawContent);
                  setReviewing({ entry, action: 'CORRECTED' });
                }}
              />
            ))}
          </div>

          {/* Paginación */}
          {data.total > 20 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[13px] text-ink-soft">
                Página {page} de {Math.ceil(data.total / 20)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= Math.ceil(data.total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

// ── Sección por empresa ───────────────────────────────────────────────────────

function CompanySection({
  companyName,
  industry,
  entries,
  onApprove,
  onReject,
  onCorrect,
}: {
  companyName: string;
  industry: string | null;
  entries: DataEntry[];
  onApprove: (e: DataEntry) => void;
  onReject: (e: DataEntry) => void;
  onCorrect: (e: DataEntry) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card>
      {/* Header empresa */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-surface-alt/50 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-granate-tenue text-granate">
            <Building2 className="size-4" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">{companyName}</p>
            {industry && <p className="text-[12px] text-ink-soft">{industry}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-action/10 px-2.5 py-0.5 text-[12px] font-semibold text-action">
            {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
          </span>
          {collapsed
            ? <ChevronDown className="size-4 text-ink-soft" />
            : <ChevronUp className="size-4 text-ink-soft" />}
        </div>
      </button>

      {/* Entradas */}
      {!collapsed && (
        <div className="border-t border-line divide-y divide-line">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onApprove={() => onApprove(entry)}
              onReject={() => onReject(entry)}
              onCorrect={() => onCorrect(entry)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Fila de entrada expandible ────────────────────────────────────────────────

function EntryRow({
  entry,
  onApprove,
  onReject,
  onCorrect,
}: {
  entry: DataEntry;
  onApprove: () => void;
  onReject: () => void;
  onCorrect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isImage = entry.fileMimeType?.startsWith('image/');
  const isPdf = entry.fileMimeType === 'application/pdf';
  const aiAnalysis = parseAIAnalysis(entry.reviewNote);

  return (
    <div className="px-5 py-4">
      {/* Cabecera de la fila */}
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-soft">
            {isImage ? <Image className="size-4" /> : isPdf ? <FileText className="size-4" /> : <Clock className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="rounded-sm bg-surface-alt px-1.5 py-0.5 text-[11px] text-ink-soft">
                {SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}
              </span>
              {aiAnalysis?.documentType && (
                <span className="rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700">
                  {DOC_TYPE_LABELS[aiAnalysis.documentType] ?? aiAnalysis.documentType}
                </span>
              )}
              {aiAnalysis?.costSection && aiAnalysis.costSection !== 'DESCONOCIDO' && (
                <span className="rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700">
                  {SECTION_LABELS[aiAnalysis.costSection] ?? aiAnalysis.costSection}
                </span>
              )}
              {aiAnalysis?.quality === 'ilegible' && (
                <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700 flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Ilegible
                </span>
              )}
            </div>
            <p className="text-[13px] text-ink-soft line-clamp-2">
              {entry.fileName ?? entry.rawContent}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-ink-soft/60">{formatDate(entry.createdAt)}</span>
              <span className="text-[11px] text-ink-soft/40">·</span>
              <span className="text-[11px] text-action hover:underline">
                {expanded ? 'Cerrar' : 'Ver todo'}
              </span>
            </div>
          </div>
        </button>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onCorrect} className="text-action hover:bg-action/10" title="Corregir y aprobar">
            <PenLine className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onApprove} className="text-green-600 hover:bg-green-50" title="Aprobar">
            <CheckCircle2 className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject} className="text-danger hover:bg-danger/10" title="Rechazar">
            <XCircle className="size-4" />
          </Button>
        </div>
      </div>

      {/* Vista expandida */}
      {expanded && (
        <div className="mt-4 space-y-3 animate-rise">
          {/* Preview imagen */}
          {entry.fileData && isImage && (
            <img
              src={`data:${entry.fileMimeType};base64,${entry.fileData}`}
              alt={entry.fileName ?? 'documento'}
              className="w-full rounded-md object-contain max-h-80 border border-line bg-surface-alt"
            />
          )}

          {/* PDF indicator */}
          {entry.fileData && isPdf && (
            <div className="flex items-center gap-3 rounded-md border border-line bg-surface-alt p-3">
              <FileText className="size-6 text-ink-soft" />
              <div>
                <p className="text-[13px] font-medium text-ink">{entry.fileName}</p>
                <p className="text-[11px] text-ink-soft">PDF adjunto</p>
              </div>
            </div>
          )}

          {/* Contenido completo */}
          {entry.rawContent && (
            <div className="rounded-md border border-line bg-surface-alt p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/60">Contenido</p>
              <p className="text-[13px] text-ink whitespace-pre-wrap">{entry.rawContent}</p>
            </div>
          )}

          {/* Análisis IA */}
          {aiAnalysis && (
            <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Bot className="size-3.5 text-indigo-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Análisis automático</span>
              </div>

              {aiAnalysis.qualityNote && (
                <div className="flex items-start gap-2 rounded bg-yellow-50 border border-yellow-200 px-2 py-1.5">
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-yellow-600" />
                  <p className="text-[12px] text-yellow-800">{aiAnalysis.qualityNote}</p>
                </div>
              )}

              {aiAnalysis.message && (
                <p className="text-[13px] text-indigo-900">{aiAnalysis.message}</p>
              )}

              {/* Datos extraídos */}
              {aiAnalysis.extractedData && (() => {
                const d = aiAnalysis.extractedData as Record<string, unknown>;
                const rows: { label: string; value: string }[] = [];
                if (d.supplier) rows.push({ label: 'Proveedor', value: String(d.supplier) });
                if (d.invoiceNumber) rows.push({ label: 'Comprobante', value: String(d.invoiceNumber) });
                if (d.date) rows.push({ label: 'Fecha', value: String(d.date) });
                if (d.netAmount != null) rows.push({ label: 'Neto', value: fmt(Number(d.netAmount)) ?? '' });
                if (d.taxAmount != null) rows.push({ label: 'IVA', value: fmt(Number(d.taxAmount)) ?? '' });
                if (d.totalAmount != null) rows.push({ label: 'Total', value: fmt(Number(d.totalAmount)) ?? '' });
                if (d.hoursWorked != null) rows.push({ label: 'Horas', value: `${d.hoursWorked} hs` });
                if (d.department) rows.push({ label: 'Departamento', value: String(d.department) });
                if (!rows.length) return null;
                return (
                  <div className="divide-y divide-indigo-100 rounded border border-indigo-100 bg-white overflow-hidden">
                    {rows.map((r) => (
                      <div key={r.label} className="flex justify-between px-3 py-1.5 text-[12px]">
                        <span className="text-ink-soft">{r.label}</span>
                        <span className="font-medium text-ink">{r.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Botones de acción al pie del expand */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="size-3.5" /> Aprobar
            </Button>
            <Button size="sm" onClick={onCorrect} variant="secondary">
              <PenLine className="size-3.5" /> Corregir
            </Button>
            <Button size="sm" onClick={onReject} className="bg-danger hover:bg-danger/90">
              <XCircle className="size-3.5" /> Rechazar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
