import { useState } from 'react';
import { History } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { useHistorial } from '@/features/validaciones/validaciones-hooks';

interface HistoryTabSectionProps {
  companyId: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Aprobada', className: 'text-green-700 bg-green-50 border-green-200' },
  REJECTED: { label: 'Rechazada', className: 'text-red-700 bg-red-50 border-red-200' },
  CORRECTED: { label: 'Corregida', className: 'text-blue-700 bg-blue-50 border-blue-200' },
};

export function HistoryTabSection({ companyId }: HistoryTabSectionProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistorial(page, companyId);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="py-12 text-center text-sm text-ink-soft">Cargando…</div>
      ) : !data?.items.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
              <History className="size-6" />
            </div>
            <p className="text-sm font-bold text-ink">Sin historial de validaciones</p>
            <p className="text-xs text-ink-soft">
              Los documentos procesados por operadores aparecerán aquí una vez que los valides.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title={`${data.total} documentos procesados`}
              description="Historial completo de aprobaciones, rechazos y correcciones"
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-line">
                {data.items.map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status];
                  return (
                    <li key={entry.id} className="flex items-start justify-between gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-sm',
                            cfg?.className
                          )}>
                            {cfg?.label ?? entry.status}
                          </span>
                          <span className="text-[11px] text-ink-soft">{entry.fileName ?? 'Texto libre'}</span>
                        </div>
                        <p className="text-[13px] text-ink font-medium leading-relaxed">
                          {entry.correctedContent ?? entry.rawContent}
                        </p>
                        {entry.reviewNote && (
                          <p className="mt-1.5 text-xs text-ink-soft italic bg-zinc-50 border-l-2 border-line px-2 py-1 rounded-r-lg">
                            "{entry.reviewNote}"
                          </p>
                        )}
                        <div className="mt-2 flex gap-4 text-[11px] text-ink-soft">
                          <span>Recibido: {formatDate(entry.createdAt)}</span>
                          {entry.reviewedAt && <span>Validado: {formatDate(entry.reviewedAt)}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          {data.total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-xs text-ink-soft">Página {page} de {Math.ceil(data.total / 20)}</span>
              <Button variant="ghost" size="sm" disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
