import { Fragment } from 'react';
import { MessageSquare, FileText, Image } from 'lucide-react';
import { CosteARLogo } from '@/components/layout/CosteARLogo';
import { cn, formatDate } from '@/lib/utils';

// Submission structure (copied to prevent compilation errors)
export interface Submission {
  id: string;
  rawContent: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  reviewNote: string | null;
  costistaNote: string | null;
  createdAt: string;
  fileName: string | null;
  fileMimeType: string | null;
  fileUrl: string | null;
  connectionId: string;
  connection: { company: { name: string } };
}

export const STATUS_CONFIG = {
  PENDING:   { label: 'Pendiente', color: 'text-warn bg-warn/10 border-warn/25' },
  APPROVED:  { label: 'Aprobado',  color: 'text-ok bg-ok/10 border-ok/25' },
  REJECTED:  { label: 'Rechazado', color: 'text-danger bg-danger/10 border-danger/25' },
  CORRECTED: { label: 'Corregido', color: 'text-granate bg-granate-tenue border-granate/25' },
} as const;

// Helper: Attachment Card inside user bubble
function FileAttachmentCard({ fileName, fileUrl, fileMimeType }: { fileName: string, fileUrl: string | null, fileMimeType: string | null }) {
  const isImage = fileMimeType?.startsWith('image/');
  const isPdf = fileMimeType === 'application/pdf';

  return (
    <div className="rounded-xl bg-white/10 border border-white/15 overflow-hidden">
      {isImage && fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block max-h-48 overflow-hidden bg-black/10">
          <img src={fileUrl} alt={fileName} className="w-full object-cover max-h-48" />
        </a>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        {isImage ? <Image className="size-4 shrink-0" /> : <FileText className="size-4 shrink-0" />}
        <span className="text-[11px] font-bold truncate flex-1">{fileName}</span>
        {isPdf && fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-extrabold uppercase tracking-wider bg-white/20 hover:bg-white/30 text-white rounded px-2 py-1 transition-colors"
          >
            Ver PDF
          </a>
        )}
      </div>
    </div>
  );
}

// ── ChatTimeline Component ──────────────────────────────────────────────────

interface ChatTimelineProps {
  submissions: Submission[];
  activeStructureName: string | null;
  costistName: string;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  sending: boolean;
}

export function ChatTimeline({
  submissions,
  activeStructureName,
  costistName,
  chatBottomRef,
  sending,
}: ChatTimelineProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-alt">
      {/* Cabecera del Chat */}
      <div className="bg-surface px-6 py-3 border-b border-line shrink-0 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-soft">Canal de Envío e Imputación Directa</p>
          <p className="text-sm font-outfit font-extrabold text-granate-deep truncate">
            {activeStructureName ? `Filtrado para: ${activeStructureName}` : 'Todos los productos'}
          </p>
        </div>
        <p className="text-xs text-ink-soft hidden sm:block">
          Los mensajes van al costista: <span className="font-bold text-ink">{costistName}</span>
        </p>
      </div>

      {/* Mensajes del Chat */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {submissions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="size-12 rounded-full bg-granate-tenue text-granate flex items-center justify-center mb-4">
              <MessageSquare className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-ink">Iniciá una conversación con CosteAR</h3>
            <p className="text-xs text-ink-soft mt-1">
              Escribí notas sobre gastos, subí fotos de comprobantes o facturas en PDF. El sistema te dará una devolución instantánea sobre el estado de clasificación.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((s) => (
              <Fragment key={s.id}>
                {/* 1. Mensaje del operario (Derecha) */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                    <div className="rounded-2xl rounded-tr-none bg-granate text-sm text-white overflow-hidden shadow-sm shadow-granate/10">
                      {s.fileName && (
                        <div className="p-3 border-b border-white/10">
                          <FileAttachmentCard fileName={s.fileName} fileUrl={s.fileUrl} fileMimeType={s.fileMimeType} />
                        </div>
                      )}
                      {s.rawContent && (
                        <div className="px-4 py-3">
                          <p className="whitespace-pre-wrap leading-relaxed">{s.rawContent}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[9px] text-ink-soft/60">
                      <span className="font-bold">Tú</span>
                      <span>•</span>
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Mensaje del Asistente CosteAR / Costista (Izquierda) */}
                <div className="flex justify-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-granate text-white shadow-sm font-bold text-xs">
                    <CosteARLogo className="h-4.5 w-auto text-white" />
                  </div>
                  <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                    <div className="rounded-2xl rounded-tl-none bg-surface border border-line p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-granate-deep">Asistente CosteAR</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border', STATUS_CONFIG[s.status].color)}>
                          {STATUS_CONFIG[s.status].label}
                        </span>
                      </div>
                      <div className="text-xs text-ink-soft leading-relaxed space-y-2 font-sans">
                        {s.status === 'PENDING' && (
                          <p>
                            Hola, recibí tu comprobante <strong>{s.fileName || 'de texto'}</strong>. El sistema clasificador de costos lo está analizando. Te avisaremos apenas el costista valide su imputación.
                          </p>
                        )}
                        {s.status === 'APPROVED' && (
                          <p>
                            ¡Comprobante procesado y aprobado! Tu costista validó los datos del documento y se imputaron correctamente en las cuentas de la empresa.
                          </p>
                        )}
                        {s.status === 'REJECTED' && (
                          <div className="space-y-2">
                            <p>El comprobante no pudo ser aprobado por tu costista.</p>
                            {s.costistaNote && (
                              <div className="bg-danger/5 border-l-2 border-l-danger p-2.5 rounded-lg text-xs italic">
                                "{s.costistaNote}"
                              </div>
                            )}
                          </div>
                        )}
                        {s.status === 'CORRECTED' && (
                          <div className="space-y-2">
                            <p>El comprobante fue aprobado con correcciones realizadas por tu costista.</p>
                            {s.costistaNote && (
                              <div className="bg-granate-tenue border-l-2 border-l-action p-2.5 rounded-lg text-xs italic">
                                "{s.costistaNote}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-ink-soft/60 pl-1">
                      <span className="font-bold">CosteAR Engine</span>
                      <span>•</span>
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        )}
        {sending && (
          <div className="flex justify-end animate-pulse">
            <div className="flex items-center gap-2 rounded-2xl rounded-tr-none bg-granate/80 px-4 py-2.5 text-sm text-white shadow-sm">
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Enviando…
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>
    </div>
  );
}
