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
import { usePendingEntries, useReviewEntry, useAccuracyStats, useBulkApprove, type DataEntry } from './validaciones-hooks';
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
  MULTIPLE: 'Múltiples Secciones',
  DESCONOCIDO: 'Sin clasificar',
};

// Opciones canónicas (MAYÚSCULA) para el selector de reclasificación.
const DOC_TYPE_OPTIONS: Record<string, string> = {
  FACTURA_COMPRA: 'Factura de compra',
  FACTURA_VENTA: 'Factura de venta',
  REMITO: 'Remito',
  LIQUIDACION_MOD: 'Liquidación de sueldos',
  PLANILLA_HORAS: 'Planilla de horas',
  NOTA_DEBITO: 'Nota de débito',
  NOTA_CREDITO: 'Nota de crédito',
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
  const { data: accuracy } = useAccuracyStats();
  const review = useReviewEntry();
  const bulkApprove = useBulkApprove();
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  // Cuántas entradas el sistema clasificó con confianza (no requieren revisión).
  const confidentCount = (data?.items ?? []).filter(
    (e) => e.classificationAudits?.[0] && !e.classificationAudits[0].requiresReview,
  ).length;

  const handleBulkApprove = async () => {
    const res = await bulkApprove.mutateAsync(undefined);
    setBulkMsg(
      res.approved > 0
        ? `Aprobaste ${res.approved} ${res.approved === 1 ? 'entrada' : 'entradas'} de confianza alta. ${res.skipped > 0 ? `Quedan ${res.skipped} para revisar a mano.` : ''}`
        : 'No había entradas de confianza alta para aprobar en bloque.',
    );
  };

  const [reviewing, setReviewing] = useState<{ entry: DataEntry; action: 'APPROVED' | 'REJECTED' | 'CORRECTED' } | null>(null);
  const [note, setNote] = useState('');
  const [correctedContent, setCorrectedContent] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [correctedType, setCorrectedType] = useState<string>('');
  const [correctedSection, setCorrectedSection] = useState<string>('');

  const handleReview = async (status: 'APPROVED' | 'REJECTED' | 'CORRECTED') => {
    if (!reviewing) return;
    await review.mutateAsync({
      entryId: reviewing.entry.id,
      status,
      note: note || undefined,
      correctedContent: status === 'CORRECTED' ? correctedContent : undefined,
      correctedDocumentType: status === 'CORRECTED' && correctedType ? correctedType : undefined,
      correctedCostSection: status === 'CORRECTED' && correctedSection ? correctedSection : undefined,
    });
    setReviewing(null);
    setNote('');
    setCorrectedContent('');
    setCorrectedType('');
    setCorrectedSection('');
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

      {/* Panel de precisión del clasificador */}
      {accuracy && accuracy.total >= 3 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AccuracyCard
            label="Precisión"
            value={accuracy.accuracy != null ? `${accuracy.accuracy}%` : '—'}
            hint={`${accuracy.correct}/${accuracy.total} sin corregir`}
            accent
          />
          <AccuracyCard
            label="Cuando está seguro"
            value={accuracy.confidentAccuracy != null ? `${accuracy.confidentAccuracy}%` : '—'}
            hint="acierto sin pedir revisión"
          />
          <AccuracyCard
            label="Reglas"
            value={accuracy.rules.accuracy != null ? `${accuracy.rules.accuracy}%` : '—'}
            hint={`${accuracy.rules.total} casos`}
          />
          <AccuracyCard
            label="Auto-clasificados"
            value={accuracy.ai.accuracy != null ? `${accuracy.ai.accuracy}%` : '—'}
            hint={`${accuracy.ai.total} casos`}
          />
        </div>
      )}

      {/* Modal de revisión */}
      {reviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setReviewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-line bg-surface p-6 shadow-xl animate-rise max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-ink">Revisar entrada</h3>
              {/* Empresa prominente: evita aplicar un costo al cliente equivocado */}
              <span className="flex items-center gap-1.5 rounded-full bg-granate-tenue px-3 py-1 text-[13px] font-semibold text-granate">
                <Building2 className="size-3.5" />
                {reviewing.entry.connection.company.name}
              </span>
            </div>

            {/* Monto que se registrará — verificá contra el comprobante antes de aprobar */}
            {(() => {
              const ai = parseAIAnalysis(reviewing.entry.reviewNote);
              const ed = ai?.extractedData as Record<string, unknown> | undefined;
              const amt = ed?.totalAmount ?? ed?.netAmount;
              if (amt == null || typeof amt !== 'number' || amt <= 0) return null;
              return (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-amber-700">Se registrará en el libro de costos</p>
                  <p className="text-lg font-bold tabular-nums text-amber-900">{fmt(amt)}</p>
                  <p className="text-[11px] text-amber-700">Verificá que coincida con el comprobante antes de aprobar.</p>
                </div>
              );
            })()}

            {/* Preview del archivo */}
            {(reviewing.entry.fileUrl ?? reviewing.entry.fileData) && reviewing.entry.fileMimeType?.startsWith('image/') && (
              <button
                type="button"
                onClick={() => setLightboxSrc(reviewing.entry.fileUrl ?? `data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`)}
                className="mb-4 w-full focus:outline-none"
              >
                <img
                  src={reviewing.entry.fileUrl ?? `data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`}
                  alt={reviewing.entry.fileName ?? 'documento'}
                  className="w-full rounded-md object-contain max-h-64 border border-line bg-surface-alt cursor-zoom-in hover:opacity-90 transition-opacity"
                />
              </button>
            )}
            {(reviewing.entry.fileUrl ?? reviewing.entry.fileData) && reviewing.entry.fileMimeType === 'application/pdf' && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-line bg-surface-alt p-3">
                <FileText className="size-5 text-ink-soft" />
                <a
                  href={reviewing.entry.fileUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-action hover:underline"
                >
                  {reviewing.entry.fileName}
                </a>
              </div>
            )}

            <div className="mb-4 rounded-md bg-surface-alt p-3 text-sm text-ink whitespace-pre-wrap">
              {reviewing.entry.rawContent}
            </div>

            {reviewing.action === 'CORRECTED' && (
              <>
                {/* Reclasificación: tipo + sección correctos. Esto entrena al
                    clasificador — la próxima vez acierta solo. */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                      Tipo correcto
                    </label>
                    <select
                      className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none"
                      value={correctedType}
                      onChange={(e) => setCorrectedType(e.target.value)}
                    >
                      <option value="">— sin cambiar —</option>
                      {Object.entries(DOC_TYPE_OPTIONS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                      Sección correcta
                    </label>
                    <select
                      className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none"
                      value={correctedSection}
                      onChange={(e) => setCorrectedSection(e.target.value)}
                    >
                      <option value="">— sin cambiar —</option>
                      {Object.entries(SECTION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
              </>
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
          {/* Resumen + aprobación masiva */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-action/10 px-3 py-1 text-[13px] font-semibold text-action">
              {data.total} pendientes
            </span>
            <span className="text-[13px] text-ink-soft">en {byCompany.size} {byCompany.size === 1 ? 'empresa' : 'empresas'}</span>
            {confidentCount > 0 && (
              <Button
                size="sm"
                onClick={handleBulkApprove}
                loading={bulkApprove.isPending}
                className="ml-auto bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="size-3.5" /> Aprobar {confidentCount} de confianza alta
              </Button>
            )}
          </div>
          {bulkMsg && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-800">
              {bulkMsg}
            </div>
          )}

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
                  setCorrectedType(entry.classificationAudits?.[0]?.documentType ?? '');
                  setCorrectedSection(entry.classificationAudits?.[0]?.costSection ?? '');
                  setReviewing({ entry, action: 'CORRECTED' });
                }}
                onZoom={setLightboxSrc}
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

      {/* Lightbox — ampliar imagen */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Vista ampliada"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full size-9 text-lg transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </AppShell>
  );
}

// ── Tarjeta de métrica de precisión ───────────────────────────────────────────

function AccuracyCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      accent ? 'border-granate/30 bg-granate-tenue/40' : 'border-line bg-surface',
    )}>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', accent ? 'text-granate' : 'text-ink')}>{value}</p>
      <p className="text-[11px] text-ink-soft/70">{hint}</p>
    </div>
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
  onZoom,
}: {
  companyName: string;
  industry: string | null;
  entries: DataEntry[];
  onApprove: (e: DataEntry) => void;
  onReject: (e: DataEntry) => void;
  onCorrect: (e: DataEntry) => void;
  onZoom: (src: string) => void;
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
              onZoom={onZoom}
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
  onZoom,
}: {
  entry: DataEntry;
  onApprove: () => void;
  onReject: () => void;
  onCorrect: () => void;
  onZoom: (src: string) => void;
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
          {/* Preview imagen — Cloudinary URL o base64 legacy */}
          {isImage && (entry.fileUrl ?? entry.fileData) && (
            <button
              type="button"
              onClick={() => onZoom(entry.fileUrl ?? `data:${entry.fileMimeType};base64,${entry.fileData}`)}
              className="w-full focus:outline-none"
            >
              <img
                src={entry.fileUrl ?? `data:${entry.fileMimeType};base64,${entry.fileData}`}
                alt={entry.fileName ?? 'documento'}
                className="w-full rounded-md object-contain max-h-80 border border-line bg-surface-alt cursor-zoom-in hover:opacity-90 transition-opacity"
              />
              <p className="text-center text-[11px] text-ink-soft mt-1">Clic para ampliar</p>
            </button>
          )}

          {/* PDF — link a Cloudinary o indicador legacy */}
          {isPdf && (entry.fileUrl ?? entry.fileData) && (
            <div className="flex items-center gap-3 rounded-md border border-line bg-surface-alt p-3">
              <FileText className="size-6 text-ink-soft shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink truncate">{entry.fileName}</p>
                {entry.fileUrl ? (
                  <a href={entry.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-action hover:underline">
                    Ver PDF →
                  </a>
                ) : (
                  <p className="text-[11px] text-ink-soft">PDF adjunto</p>
                )}
              </div>
            </div>
          )}

          {/* Contenido de texto */}
          {entry.rawContent && !entry.rawContent.startsWith('[Archivo:') && (
            <div className="rounded-md border border-line bg-surface-alt p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/60">Contenido</p>
              <p className="text-[13px] text-ink whitespace-pre-wrap">{entry.rawContent}</p>
            </div>
          )}

          {/* Análisis IA + Clasificación */}
          {aiAnalysis && (
            <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Bot className="size-3.5 text-indigo-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Análisis del documento</span>
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

              {/* Explicación del clasificador */}
              {entry.classificationAudits?.[0] && (
                <div className="rounded border border-indigo-200 bg-white p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Por qué se clasificó así</p>
                  {entry.classificationAudits[0].explanation && (
                    <p className="text-[12px] text-ink-soft leading-relaxed">{entry.classificationAudits[0].explanation}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {entry.classificationAudits[0].confidence != null && (
                      <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-700">
                        {Math.round(entry.classificationAudits[0].confidence ?? 0)}% confianza
                      </span>
                    )}
                    {entry.classificationAudits[0].definitiveSignal && (
                      <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-700 font-mono">
                        señal: {entry.classificationAudits[0].definitiveSignal}
                      </span>
                    )}
                    {entry.classificationAudits[0].aiUsed && (
                      <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] text-purple-700">
                        Auto-procesado
                      </span>
                    )}
                    {entry.classificationAudits[0].requiresReview && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] text-amber-700">
                        requiere revisión
                      </span>
                    )}
                  </div>
                </div>
              )}
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
