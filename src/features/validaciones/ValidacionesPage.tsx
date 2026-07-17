import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  PenLine,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  FileText,
  Image,
  AlertTriangle,
  Bot,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  usePendingEntries,
  useReviewEntry,
  useAccuracyStats,
  useBulkApprove,
  type DataEntry,
} from "./validaciones-hooks";
import { formatDate } from "@/lib/utils";

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
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.documentType || parsed.message)
    ) {
      return parsed as AIAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: "Materia Prima",
  MANO_DE_OBRA: "Mano de Obra",
  COSTOS_INDIRECTOS: "Costos Indirectos",
  VENTAS: "Ventas",
  // Gastos (no-costo): no forman parte del costo del producto.
  GASTO_COMERCIALIZACION: "Gasto de Comercialización",
  GASTO_ADMINISTRACION: "Gasto de Administración",
  GASTO_FINANCIERO: "Gasto Financiero",
  MULTIPLE: "Múltiples Secciones",
  DESCONOCIDO: "Sin clasificar",
};

// Opciones canónicas (MAYÚSCULA) para el selector de reclasificación.
const DOC_TYPE_OPTIONS: Record<string, string> = {
  FACTURA_COMPRA: "Factura de compra",
  FACTURA_VENTA: "Factura de venta",
  REMITO: "Remito",
  LIQUIDACION_MOD: "Liquidación de sueldos",
  PLANILLA_HORAS: "Planilla de horas",
  NOTA_DEBITO: "Nota de débito",
  NOTA_CREDITO: "Nota de crédito",
  DESCONOCIDO: "Sin clasificar",
};

function fmt(n?: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n);
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
    (e) =>
      e.classificationAudits?.[0] && !e.classificationAudits[0].requiresReview,
  ).length;

  const handleBulkApprove = async () => {
    const res = await bulkApprove.mutateAsync(undefined);
    setBulkMsg(
      res.approved > 0
        ? `Aprobaste ${res.approved} ${res.approved === 1 ? "entrada" : "entradas"} de confianza alta. ${res.skipped > 0 ? `Quedan ${res.skipped} para revisar a mano.` : ""}`
        : "No había entradas de confianza alta para aprobar en bloque.",
    );
  };

  const [reviewing, setReviewing] = useState<{
    entry: DataEntry;
    action: "APPROVED" | "REJECTED" | "CORRECTED";
  } | null>(null);
  const [note, setNote] = useState("");
  const [correctedContent, setCorrectedContent] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [correctedType, setCorrectedType] = useState<string>("");
  const [correctedSection, setCorrectedSection] = useState<string>("");

  const handleReview = async (
    status: "APPROVED" | "REJECTED" | "CORRECTED",
  ) => {
    if (!reviewing) return;
    await review.mutateAsync({
      entryId: reviewing.entry.id,
      status,
      note: note || undefined,
      correctedContent: status === "CORRECTED" ? correctedContent : undefined,
      correctedDocumentType:
        status === "CORRECTED" && correctedType ? correctedType : undefined,
      correctedCostSection:
        status === "CORRECTED" && correctedSection
          ? correctedSection
          : undefined,
    });
    setReviewing(null);
    setNote("");
    setCorrectedContent("");
    setCorrectedType("");
    setCorrectedSection("");
  };

  // Agrupar por empresa
  const byCompany = (data?.items ?? []).reduce<
    Map<string, { name: string; industry: string | null; entries: DataEntry[] }>
  >((map, entry) => {
    const { id, name, industry } = entry.connection.company;
    if (!map.has(id)) map.set(id, { name, industry, entries: [] });
    map.get(id)!.entries.push(entry);
    return map;
  }, new Map());

  return (
    <AppShell wide>
      {/* Hero Section */}
      <div className="mb-10 rounded-[28px] border border-line bg-white p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(74,21,27,0.015)] hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-action/10 blur-3xl" />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1 text-[11px] font-bold text-granate tracking-wide">
              <ClipboardCheck className="size-3.5" /> Valida documentos
            </span>
          </div>
          <h1 className="text-[36px] font-extrabold leading-[1.1] text-granate-deep tracking-tight">
            Revisa documentos
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-soft max-w-2xl">
            Validá los datos cargados por tus clientes. El clasificador te ayuda
            identificando documentos, pero vos eres el experto en el negocio.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-line/60 relative z-10 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-granate-tenue text-granate">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Pendientes
              </p>
              <p className="text-[20px] font-extrabold text-granate-deep leading-none mt-1">
                {data?.total ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Precisión
              </p>
              <p className="text-[20px] font-extrabold text-emerald-700 leading-none mt-1">
                {accuracy?.accuracy != null ? `${accuracy.accuracy}%` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200/50">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Empresas
              </p>
              <p className="text-[20px] font-extrabold text-violet-700 leading-none mt-1">
                {byCompany.size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de revisión */}
      {reviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setReviewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] border border-line bg-surface p-5 shadow-[0_25px_60px_rgba(74,21,27,0.15)] animate-rise max-h-[92vh] overflow-y-auto sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[17px] font-extrabold text-granate-deep">
                Revisar entrada
              </h3>
              {/* Empresa prominente: evita aplicar un costo al cliente equivocado */}
              <span className="flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1.5 text-[12px] font-bold text-granate shadow-sm">
                <Building2 className="size-3.5" />
                {reviewing.entry.connection.company.name}
              </span>
            </div>

            {/* Monto que se registrará — verificá contra el comprobante antes de aprobar */}
            {(() => {
              const ai = parseAIAnalysis(reviewing.entry.reviewNote);
              const ed = ai?.extractedData as
                | Record<string, unknown>
                | undefined;
              const amt = ed?.totalAmount ?? ed?.netAmount;
              if (amt == null || typeof amt !== "number" || amt <= 0)
                return null;
              return (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-amber-700">
                    Se registrará en el libro de costos
                  </p>
                  <p className="mt-0.5 font-mono-jb text-lg font-bold tabular-nums text-amber-900">
                    {fmt(amt)}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Verificá que coincida con el comprobante antes de aprobar.
                  </p>
                </div>
              );
            })()}

            {/* Preview del archivo */}
            {(reviewing.entry.fileUrl ?? reviewing.entry.fileData) &&
              reviewing.entry.fileMimeType?.startsWith("image/") && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxSrc(
                      reviewing.entry.fileUrl ??
                        `data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`,
                    )
                  }
                  className="mb-4 w-full focus:outline-none"
                >
                  <img
                    src={
                      reviewing.entry.fileUrl ??
                      `data:${reviewing.entry.fileMimeType};base64,${reviewing.entry.fileData}`
                    }
                    alt={reviewing.entry.fileName ?? "documento"}
                    className="w-full rounded-2xl object-contain max-h-64 border border-line bg-surface-alt cursor-zoom-in hover:opacity-90 transition-opacity"
                  />
                </button>
              )}
            {(reviewing.entry.fileUrl ?? reviewing.entry.fileData) &&
              reviewing.entry.fileMimeType === "application/pdf" && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-surface-alt p-3.5">
                  <FileText className="size-5 text-ink-soft" />
                  <a
                    href={reviewing.entry.fileUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-semibold text-action hover:underline"
                  >
                    {reviewing.entry.fileName}
                  </a>
                </div>
              )}

            <div className="mb-4 rounded-2xl border border-line bg-zinc-50/60 p-4 text-sm text-ink whitespace-pre-wrap">
              {reviewing.entry.rawContent}
            </div>

            {reviewing.action === "CORRECTED" && (
              <>
                {/* Reclasificación: tipo + sección correctos. Esto entrena al
                    clasificador — la próxima vez acierta solo. */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                      Tipo correcto
                    </label>
                    <select
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
                      value={correctedType}
                      onChange={(e) => setCorrectedType(e.target.value)}
                    >
                      <option value="">— sin cambiar —</option>
                      {Object.entries(DOC_TYPE_OPTIONS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                      Sección correcta
                    </label>
                    <select
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
                      value={correctedSection}
                      onChange={(e) => setCorrectedSection(e.target.value)}
                    >
                      <option value="">— sin cambiar —</option>
                      {Object.entries(SECTION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] font-medium uppercase tracking-wide text-ink-soft mb-1.5">
                    Contenido corregido
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors focus:border-granate focus:outline-none min-h-20"
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
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
                placeholder="Ej: actualizado en estructura de costos de Oct 2025"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewing(null)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleReview(reviewing.action)}
                loading={review.isPending}
                className={cn(
                  "w-full sm:w-auto",
                  reviewing.action === "APPROVED" &&
                    "bg-green-600 hover:bg-green-700",
                  reviewing.action === "REJECTED" &&
                    "bg-danger hover:bg-danger/90",
                  reviewing.action === "CORRECTED" &&
                    "bg-action hover:bg-action/90",
                )}
              >
                {reviewing.action === "APPROVED" && "Confirmar aprobación"}
                {reviewing.action === "REJECTED" && "Confirmar rechazo"}
                {reviewing.action === "CORRECTED" && "Guardar corrección"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-[13px] font-semibold text-ink-soft">
          Cargando…
        </div>
      ) : !data?.items.length ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-white text-granate shadow-sm">
              <ClipboardCheck className="size-6" />
            </div>
            <p className="text-[13px] font-bold text-ink">Todo al día</p>
            <p className="mt-1 text-[11px] text-ink-soft">
              No hay datos pendientes de validación.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Resumen + aprobación masiva */}
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="rounded-full border border-action/15 bg-action/10 px-3.5 py-1.5 text-[12px] font-bold text-action shadow-sm">
              {data.total} pendientes
            </span>
            <span className="text-[12px] font-semibold text-ink-soft">
              en {byCompany.size}{" "}
              {byCompany.size === 1 ? "empresa" : "empresas"}
            </span>
            {confidentCount > 0 && (
              <Button
                size="sm"
                onClick={handleBulkApprove}
                loading={bulkApprove.isPending}
                className="w-full sm:ml-auto sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="size-3.5" /> Aprobar {confidentCount}{" "}
                de confianza alta
              </Button>
            )}
          </div>
          {bulkMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-[12.5px] font-semibold text-green-800 shadow-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              {bulkMsg}
            </div>
          )}

          {/* Sección por empresa */}
          <div className="space-y-4">
            {[...byCompany.entries()].map(
              ([companyId, { name, industry, entries }]) => (
                <CompanySection
                  key={companyId}
                  companyName={name}
                  industry={industry}
                  entries={entries}
                  onApprove={(entry) =>
                    setReviewing({ entry, action: "APPROVED" })
                  }
                  onReject={(entry) =>
                    setReviewing({ entry, action: "REJECTED" })
                  }
                  onCorrect={(entry) => {
                    setCorrectedContent(entry.rawContent);
                    setCorrectedType(
                      entry.classificationAudits?.[0]?.documentType ?? "",
                    );
                    setCorrectedSection(
                      entry.classificationAudits?.[0]?.costSection ?? "",
                    );
                    setReviewing({ entry, action: "CORRECTED" });
                  }}
                  onZoom={setLightboxSrc}
                />
              ),
            )}
          </div>

          {/* Paginación */}
          {data.total > 20 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-[12px] font-semibold text-ink-soft">
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
      {lightboxSrc && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Vista ampliada"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full size-9 text-lg transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </AppShell>
  );
}

// ── Tarjeta de métrica de precisión ───────────────────────────────────────────

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
    <Card className="overflow-hidden">
      {/* Header empresa */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-zinc-50/50 transition-colors sm:px-6 sm:py-5"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate shadow-sm">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-ink">
              {companyName}
            </p>
            {industry && (
              <p className="truncate text-[11px] font-medium text-ink-soft">
                {industry}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-action/15 bg-action/10 px-2.5 py-1 text-[11px] font-bold text-action shadow-sm">
            {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
          </span>
          {collapsed ? (
            <ChevronDown className="size-4 text-ink-soft" />
          ) : (
            <ChevronUp className="size-4 text-ink-soft" />
          )}
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
  const isImage = entry.fileMimeType?.startsWith("image/");
  const isPdf = entry.fileMimeType === "application/pdf";
  const aiAnalysis = parseAIAnalysis(entry.reviewNote);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-4.5">
      {/* Cabecera de la fila */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <button
          type="button"
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-zinc-50 text-zinc-400">
            {isImage ? (
              <Image className="size-3.5" />
            ) : isPdf ? (
              <FileText className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {aiAnalysis?.costSection &&
                aiAnalysis.costSection !== "DESCONOCIDO" && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 shadow-sm">
                    {SECTION_LABELS[aiAnalysis.costSection] ??
                      aiAnalysis.costSection}
                  </span>
                )}
              {aiAnalysis?.quality === "ilegible" && (
                <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700 shadow-sm">
                  <AlertTriangle className="size-3" /> Ilegible
                </span>
              )}
            </div>
            <p className="text-[12.5px] font-bold text-ink line-clamp-2">
              {entry.fileName ?? entry.rawContent}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10.5px] font-semibold text-ink-soft/70">
                {formatDate(entry.createdAt)}
              </span>
              <span className="text-[10.5px] text-ink-soft/40">·</span>
              <span className="text-[10.5px] font-bold text-action hover:underline">
                {expanded ? "Cerrar" : "Ver todo"}
              </span>
            </div>
          </div>
        </button>

        {/* Acciones */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCorrect}
            className="text-action hover:bg-action/10"
            title="Corregir y aprobar"
          >
            <PenLine className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onApprove}
            className="text-green-600 hover:bg-green-50"
            title="Aprobar"
          >
            <CheckCircle2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            className="text-danger hover:bg-danger/10"
            title="Rechazar"
          >
            <XCircle className="size-4" />
          </Button>
        </div>
      </div>

      {/* Vista expandida */}
      {expanded && (
        <div className="mt-4 border-t border-line/60 pt-4 animate-rise space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Columna Izquierda: Vista del Documento (Ancho 5/12) */}
            <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
              <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
                <div className="bg-zinc-50 border-b border-line px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wider">Documento Adjunto</span>
                  {(isImage || isPdf) && (
                    <span className="text-[10px] bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full text-indigo-700 font-bold">
                      {isImage ? 'Imagen' : 'PDF'}
                    </span>
                  )}
                </div>
                
                <div className="p-4 flex items-center justify-center bg-zinc-50/20 min-h-[220px] max-h-[380px] overflow-auto">
                  {isImage && (entry.fileUrl ?? entry.fileData) ? (
                    <button
                      type="button"
                      onClick={() =>
                        onZoom(
                          entry.fileUrl ??
                            `data:${entry.fileMimeType};base64,${entry.fileData}`,
                        )
                      }
                      className="group relative cursor-zoom-in focus:outline-none max-w-full"
                    >
                      <img
                        src={
                          entry.fileUrl ??
                          `data:${entry.fileMimeType};base64,${entry.fileData}`
                        }
                        alt={entry.fileName ?? "documento"}
                        className="rounded-xl object-contain max-h-[340px] hover:opacity-95 transition-opacity border border-line shadow-xs"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-colors flex items-center justify-center">
                        <span className="bg-black/75 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          Hacer clic para ampliar
                        </span>
                      </div>
                    </button>
                  ) : isPdf && (entry.fileUrl ?? entry.fileData) ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-400">
                        <FileText className="size-6 text-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-ink truncate max-w-[200px]" title={entry.fileName ?? ""}>
                          {entry.fileName}
                        </p>
                        <p className="text-[10px] text-ink-soft">Documento PDF cargado por operario</p>
                      </div>
                      {entry.fileUrl ? (
                        <a
                          href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-action px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-action-soft transition-colors"
                        >
                          Ver PDF en pestaña nueva
                        </a>
                      ) : (
                        <a
                          href={`data:${entry.fileMimeType};base64,${entry.fileData}`}
                          download={entry.fileName ?? "documento.pdf"}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-action px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-action-soft transition-colors"
                        >
                          Descargar archivo PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center text-ink-soft">
                      <Clock className="size-6 text-zinc-300" />
                      <p className="text-xs">Sin archivo adjunto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Datos extraídos y Análisis IA (Ancho 7/12) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Contenido de texto libre (si no es archivo) */}
              {entry.rawContent && !entry.rawContent.startsWith("[Archivo:") && (
                <div className="rounded-2xl border border-line bg-zinc-50/50 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Nota Cargada por Operario</span>
                  <p className="text-[12.5px] text-ink leading-relaxed whitespace-pre-wrap font-medium">
                    {entry.rawContent}
                  </p>
                </div>
              )}

              {/* Análisis IA + Clasificación */}
              {aiAnalysis && (
                <div className="space-y-4">
                  {aiAnalysis.qualityNote && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-yellow-50 border border-yellow-250 px-3.5 py-2.5">
                      <AlertTriangle className="size-4 shrink-0 text-yellow-600 mt-0.5" />
                      <p className="text-xs font-medium text-yellow-800 leading-relaxed">
                        {aiAnalysis.qualityNote}
                      </p>
                    </div>
                  )}

                  {aiAnalysis.message && (
                    <div className="rounded-xl bg-indigo-50/20 border border-indigo-100 p-4 shadow-xs">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1.5">
                        <Bot className="size-3.5 text-indigo-500" />
                        <span>Análisis del documento</span>
                      </div>
                      <p className="text-[12.5px] text-indigo-950 font-medium leading-relaxed">
                        {aiAnalysis.message}
                      </p>
                    </div>
                  )}

                  {/* Datos extraídos en formato tabla limpia */}
                  {aiAnalysis.extractedData &&
                    (() => {
                      const d = aiAnalysis.extractedData as Record<string, unknown>;
                      const rows: { label: string; value: string; isTotal?: boolean }[] = [];
                      if (d.supplier) rows.push({ label: "Proveedor", value: String(d.supplier) });
                      if (d.invoiceNumber) rows.push({ label: "Nº Comprobante", value: String(d.invoiceNumber) });
                      if (d.date) rows.push({ label: "Fecha Emisión", value: String(d.date) });
                      if (d.netAmount != null) rows.push({ label: "Monto Neto", value: fmt(Number(d.netAmount)) ?? "" });
                      if (d.taxAmount != null) rows.push({ label: "IVA / Impuestos", value: fmt(Number(d.taxAmount)) ?? "" });
                      if (d.totalAmount != null) rows.push({ label: "Total Facturado", value: fmt(Number(d.totalAmount)) ?? "", isTotal: true });
                      if (d.hoursWorked != null) rows.push({ label: "Horas trabajadas (real)", value: `${d.hoursWorked} hs` });
                      if (d.department) rows.push({ label: "Departamento", value: String(d.department) });
                      if (!rows.length) return null;
                      return (
                        <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
                          <div className="bg-zinc-50 border-b border-line px-4 py-2.5">
                            <span className="text-[11px] font-extrabold text-ink-soft uppercase tracking-wider">Metadatos de Facturación Extraditados</span>
                          </div>
                          <div className="divide-y divide-line">
                            {rows.map((r) => (
                              <div
                                key={r.label}
                                className={cn(
                                  "flex justify-between px-4 py-3 text-xs items-center",
                                  r.isTotal ? "bg-zinc-50/50 font-bold text-ink text-[13px] border-t border-line/60" : "text-ink-soft"
                                )}
                              >
                                <span>{r.label}</span>
                                <span className={cn("font-semibold text-ink", r.isTotal && "text-granate font-extrabold")}>
                                  {r.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Explicación de Clasificación Auditoría IA */}
                  {entry.classificationAudits?.[0] && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                          <Bot className="size-4 text-indigo-500 animate-pulse" />
                          <span>Análisis del Asistente IA</span>
                        </div>
                        {entry.classificationAudits[0].confidence != null && (
                          <span className="rounded-full bg-indigo-100/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                            Confianza: {entry.classificationAudits[0].confidence}%
                          </span>
                        )}
                      </div>

                      {entry.classificationAudits[0].explanation && (
                        <p className="text-[12px] text-ink-soft leading-relaxed font-sans">
                          {entry.classificationAudits[0].explanation
                            .replace(
                              /\.?\s*Confianza:\s*\d+(?:[.,]\d+)?\s*%\.?/i,
                              "",
                            )
                            .trim()}
                        </p>
                      )}

                      {/* Confidence Bar */}
                      {entry.classificationAudits[0].confidence != null && (
                        <div className="w-full bg-indigo-100/50 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${entry.classificationAudits[0].confidence}%` }}
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entry.classificationAudits[0].definitiveSignal && (
                          <span className="rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-[10px] text-indigo-700 font-mono shadow-sm">
                            señal: {entry.classificationAudits[0].definitiveSignal}
                          </span>
                        )}
                        {entry.classificationAudits[0].requiresReview && (
                          <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-800 font-semibold shadow-sm">
                            ⚠️ requiere revisión
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción al pie del expand */}
          <div className="flex flex-col gap-2 pt-4 border-t border-line/60 sm:flex-row justify-end">
            <Button
              size="sm"
              onClick={onReject}
              className="w-full sm:w-auto bg-danger hover:bg-danger/90 order-last sm:order-first"
            >
              <XCircle className="size-3.5" /> Rechazar
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row flex-1 sm:justify-end">
              <Button
                size="sm"
                onClick={onCorrect}
                variant="secondary"
                className="w-full sm:w-auto border-line hover:bg-zinc-50"
              >
                <PenLine className="size-3.5" /> Corregir
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="size-3.5" /> Aprobar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
