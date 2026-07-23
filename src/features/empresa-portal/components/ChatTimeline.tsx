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
  PENDING:   { label: 'Pendiente', color: 'text-warn bg-warn/15 border-warn/30 shadow-sm shadow-warn/10' },
  APPROVED:  { label: 'Aprobado',  color: 'text-ok bg-ok/15 border-ok/30 shadow-sm shadow-ok/10' },
  REJECTED:  { label: 'Rechazado', color: 'text-danger bg-danger/15 border-danger/30 shadow-sm shadow-danger/10' },
  CORRECTED: { label: 'Corregido', color: 'text-granate bg-granate-tenue border-granate/30 shadow-sm shadow-granate/10' },
} as const;

// Helper: Attachment Card inside user bubble
function FileAttachmentCard({ fileName, fileUrl, fileMimeType }: { fileName: string, fileUrl: string | null, fileMimeType: string | null }) {
  const isImage = fileMimeType?.startsWith('image/');
  const isPdf = fileMimeType === 'application/pdf';

  return (
    <div className="rounded-2xl bg-white/20 border border-white/20 overflow-hidden shadow-inner backdrop-blur-sm group transition-all">
      {isImage && fileUrl && (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden bg-black/10 relative">
          <img src={fileUrl} alt={fileName} className="w-full object-cover max-h-56 group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </a>
      )}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/5">
        <div className="size-8 shrink-0 rounded-full bg-white/20 flex items-center justify-center shadow-sm">
          {isImage ? <Image className="size-4" /> : <FileText className="size-4" />}
        </div>
        <span className="text-[12px] font-bold truncate flex-1 tracking-tight drop-shadow-sm">{fileName}</span>
        {isPdf && fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-black uppercase tracking-wider bg-white text-granate hover:bg-white/90 rounded-full px-3 py-1.5 shadow-md transition-all active:scale-95"
          >
            Abrir
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24">
        {submissions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
            <div className="size-16 rounded-3xl bg-granate text-white flex items-center justify-center mb-6 shadow-xl shadow-granate/20 rotate-[-5deg] hover:rotate-0 transition-transform">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="text-xl font-black text-ink font-outfit tracking-tight">Iniciá una conversación</h3>
            <p className="text-[14px] text-ink-soft/90 mt-2 font-medium leading-relaxed px-4">
              Escribí notas sobre gastos, subí fotos de comprobantes o facturas en PDF. El sistema te dará una devolución instantánea sobre el estado de clasificación.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {submissions.map((s) => (
              <Fragment key={s.id}>
                {/* 1. Mensaje del operario (Derecha) */}
                <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="max-w-[90%] sm:max-w-[70%] space-y-1.5">
                    <div className="rounded-[28px] rounded-tr-[8px] bg-granate text-[15px] text-white overflow-hidden shadow-[0_8px_20px_rgba(74,21,27,0.15)] transition-all">
                      {s.fileName && (
                        <div className="p-2 border-b border-white/10">
                          <FileAttachmentCard fileName={s.fileName} fileUrl={s.fileUrl} fileMimeType={s.fileMimeType} />
                        </div>
                      )}
                      {s.rawContent && (
                        <div className="px-5 py-4">
                          <p className="whitespace-pre-wrap leading-relaxed drop-shadow-sm">{s.rawContent}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-ink-soft/70 px-1 font-medium tracking-wide">
                      <span className="font-bold">Tú</span>
                      <span>•</span>
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Mensaje del Asistente CosteAR / Costista (Izquierda) */}
                <div className="flex justify-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[18px] bg-white text-granate shadow-md border border-line/50 font-bold text-xs mt-1">
                    <CosteARLogo className="h-5 w-auto text-granate" />
                  </div>
                  <div className="max-w-[90%] sm:max-w-[75%] space-y-1.5">
                    <div className="rounded-[28px] rounded-tl-[8px] bg-white border border-line p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[11px] font-black uppercase tracking-widest text-granate-deep/80">Asistente CosteAR</span>
                        <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border', STATUS_CONFIG[s.status].color)}>
                          {STATUS_CONFIG[s.status].label}
                        </span>
                      </div>
                      <div className="text-[14px] text-ink-soft leading-relaxed space-y-3 font-sans font-medium">
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
                              <div className="mt-4 rounded-[16px] bg-granate-tenue p-4 text-[13px] border-l-4 border-l-granate shadow-inner">
                                <p className="font-black text-granate-deep mb-1 text-[11px] uppercase tracking-wider">Nota del Costista ({costistName}):</p>
                                <p className="italic text-ink/80 font-medium leading-relaxed">"{s.costistaNote}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-ink-soft/70 px-1 font-medium tracking-wide">
                      <span>{formatDate(s.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        )}

        {/* Bubble when sending... */}
        {sending && (
          <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-[90%] sm:max-w-[70%]">
              <div className="rounded-[28px] rounded-tr-[8px] bg-granate/80 text-white shadow-[0_8px_20px_rgba(74,21,27,0.15)]">
                <div className="px-5 py-4 flex items-center gap-3">
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[14px] font-medium animate-pulse drop-shadow-sm">Enviando comprobante...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>
    </div>
  );
}
