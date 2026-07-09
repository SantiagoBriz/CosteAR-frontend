import { MessageSquare, FileText, Image } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { Submission, STATUS_CONFIG } from './ChatTimeline';

// ── SubmissionCard Component ────────────────────────────────────────────────

interface SubmissionCardProps {
  s: Submission;
}

export function SubmissionCard({ s }: SubmissionCardProps) {
  const st = STATUS_CONFIG[s.status];
  const isImage = s.fileMimeType?.startsWith('image/');
  const isPdf = s.fileMimeType === 'application/pdf';

  return (
    <Card className="hover:-translate-y-1 transition-all duration-300">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            {isImage ? (
              <Image className="size-4 text-action shrink-0" />
            ) : isPdf ? (
              <FileText className="size-4 text-action shrink-0" />
            ) : (
              <FileText className="size-4 text-ink-soft shrink-0" />
            )}
            <span className="truncate max-w-[150px] font-bold text-ink" title={s.fileName ?? 'Texto sin archivo'}>
              {s.fileName ?? 'Nota de texto'}
            </span>
          </div>
        }
        description={`Enviado: ${formatDate(s.createdAt)}`}
        action={
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border', st.color)}>
            {st.label}
          </span>
        }
      />
      <CardBody className="space-y-4">
        {s.rawContent && (
          <p className="text-xs text-ink-soft bg-surface-alt p-3.5 rounded-xl border border-line whitespace-pre-wrap leading-relaxed">
            {s.rawContent}
          </p>
        )}

        {isImage && s.fileUrl && (
          <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line">
            <img
              src={s.fileUrl}
              alt="Documento"
              className="w-full max-h-40 object-cover hover:scale-[1.02] transition-transform duration-300"
            />
          </a>
        )}

        {isPdf && s.fileUrl && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-alt p-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="size-5 text-action shrink-0" />
              <span className="text-xs font-semibold text-ink truncate max-w-[100px]">{s.fileName}</span>
            </div>
            <a
              href={s.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-wider text-action hover:text-action-soft bg-surface border border-line rounded-lg px-2.5 py-1.5 shadow-sm transition-all"
            >
              Ver PDF
            </a>
          </div>
        )}

        {s.costistaNote && (
          <div className="rounded-xl border border-line bg-granate-tenue p-3.5 text-xs text-ink-soft leading-relaxed border-l-4 border-l-action">
            <p className="font-bold text-ink mb-0.5">Nota de revisión de tu costista:</p>
            <p className="italic">"{s.costistaNote}"</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── SubmissionGrid Component ────────────────────────────────────────────────

interface SubmissionGridProps {
  submissions: Submission[];
  isLoadingSubmissions: boolean;
  activeStructureName: string | null;
  onNavigateToChat: () => void;
}

export function SubmissionGrid({
  submissions,
  isLoadingSubmissions,
  activeStructureName,
  onNavigateToChat,
}: SubmissionGridProps) {
  // Metric counts
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const correctedCount = submissions.filter((s) => s.status === 'CORRECTED').length;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-28 lg:pb-8">
      {/* Métricas rápidas (Estilo Costista) */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aprobados', val: approvedCount, color: 'text-ok bg-ok/5' },
          { label: 'Pendientes', val: pendingCount, color: 'text-warn bg-warn/5' },
          { label: 'Corregidos', val: correctedCount, color: 'text-granate bg-granate-tenue' },
        ].map(({ label, val, color }) => (
          <Card key={label} className={cn('text-center py-4 rounded-[20px]', color)}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</p>
            <p className="text-2xl font-black mt-1 font-mono-jb">{val}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-base font-extrabold text-granate-deep font-outfit">Historial de Comprobantes</h2>
          {activeStructureName ? (
            <p className="text-xs text-ink-soft">
              Filtrado por: <span className="font-semibold text-action">{activeStructureName}</span>
            </p>
          ) : (
            <p className="text-xs text-ink-soft">Mostrando todos los productos del período</p>
          )}
        </div>
        <Button size="sm" onClick={onNavigateToChat}>
          <MessageSquare className="size-4 mr-1" /> Ir a Charla
        </Button>
      </div>

      {isLoadingSubmissions ? (
        <p className="text-sm text-ink-soft text-center py-12">Cargando comprobantes...</p>
      ) : submissions.length === 0 ? (
        <Card className="py-16 text-center">
          <CardBody>
            <FileText className="mx-auto size-10 text-idle opacity-40 mb-3" />
            <p className="text-sm font-semibold text-ink-soft">No se encontraron comprobantes cargados.</p>
            <p className="text-xs text-ink-soft/70 mt-1">Presioná "Ir a Charla" para subir comprobantes.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {submissions.map((sub) => (
            <SubmissionCard key={sub.id} s={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
