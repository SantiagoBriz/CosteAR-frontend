import { useTraceData } from '../cost-structure-hooks';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { History, FileText, User, Tag, ArrowRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TraceCard({ versionId, onClose }: { versionId: string; onClose: () => void }) {
  const { data: trace, isLoading, error } = useTraceData(versionId);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface shadow-2xl border-l border-line overflow-y-auto animate-fade-in flex flex-col">
      <div className="p-4 border-b border-line flex items-center justify-between bg-surface-alt/50 sticky top-0 z-10">
        <h3 className="font-bold text-ink flex items-center gap-2">
          <Activity className="size-4 text-granate" /> Ficha del Dato In-Place
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-action/10 rounded text-ink-soft hover:text-ink">
          ✕
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-soft text-sm">Cargando trazabilidad...</div>
      ) : error || !trace ? (
        <div className="p-8 text-center text-danger text-sm">Error o dato no encontrado. (Nota: Para la demo, el UUID puede no existir en la DB local)</div>
      ) : (
        <div className="p-4 space-y-6">
          <Card>
            <CardHeader title="Información Base" />
            <CardBody className="space-y-2 text-sm p-4">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-ink-soft">Entidad</span>
                <span className="font-medium text-ink">{trace.entityType}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-ink-soft">Categoría</span>
                <span className="font-medium text-ink">{trace.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Unidad</span>
                <span className="font-medium text-ink">{trace.unit}</span>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-3">
            <h4 className="font-semibold text-[13px] text-ink flex items-center gap-1.5 uppercase tracking-wider">
              <History className="size-4 text-action" /> Historial Inmutable
            </h4>
            <div className="relative border-l-2 border-line/50 ml-3 space-y-4 pb-2">
              {trace.versions?.map((v: any, index: number) => {
                const isCurrent = index === 0;
                return (
                  <div key={v.id} className="relative pl-5">
                    <div className={cn("absolute -left-[5px] top-1.5 size-2 rounded-full", isCurrent ? "bg-ok" : "bg-line")} />
                    <div className={cn("p-3 rounded-lg border", isCurrent ? "border-ok/30 bg-ok/5" : "border-line bg-surface-alt/30")}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-ink-soft">{formatDate(v.validFrom)}</span>
                        {isCurrent && <span className="text-[9px] uppercase font-bold text-ok bg-ok/10 px-1.5 rounded">Actual</span>}
                      </div>
                      
                      <div className="text-lg font-black text-ink mb-2">
                        {Number(v.valueNum)} {trace.unit}
                      </div>
                      
                      <div className="flex flex-col gap-1 text-[11px] text-ink-soft">
                        <span className="flex items-center gap-1"><User className="size-3" /> {v.author?.name || 'Sistema'} ({v.authorArea})</span>
                        <span className="flex items-center gap-1"><Tag className="size-3" /> Captura: {v.captureMethod}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {trace.evidences && trace.evidences.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-[13px] text-ink flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="size-4 text-action" /> Evidencia Documental
              </h4>
              <div className="space-y-2">
                {trace.evidences.map((e: any) => (
                  <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="block p-3 rounded border border-line bg-surface hover:border-action transition-colors group">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink group-hover:text-action transition-colors">{e.filename}</span>
                      <ArrowRight className="size-3 text-ink-soft group-hover:text-action transition-colors" />
                    </div>
                    <div className="text-[11px] text-ink-soft mt-1">Subido el {formatDate(e.uploadedAt)}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
