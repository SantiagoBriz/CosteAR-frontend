import { useState } from 'react';
import { ClipboardCheck, Clock, CheckCircle2, XCircle, PenLine, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
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

            <div className="mb-4 rounded-md bg-surface-alt p-3 text-sm text-ink">
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
          <Card>
            <CardHeader
              title={`${data.total} entradas pendientes`}
              description="Datos enviados por tus clientes que esperan tu revisión"
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-line">
                {data.items.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onApprove={() => setReviewing({ entry, action: 'APPROVED' })}
                    onReject={() => setReviewing({ entry, action: 'REJECTED' })}
                    onCorrect={() => {
                      setCorrectedContent(entry.rawContent);
                      setReviewing({ entry, action: 'CORRECTED' });
                    }}
                  />
                ))}
              </ul>
            </CardBody>
          </Card>

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
  return (
    <li className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-soft">
          <Clock className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm text-ink">{entry.connection.company.name}</span>
            <span className="rounded-sm bg-surface-alt px-1.5 py-0.5 text-[11px] text-ink-soft">
              {SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}
            </span>
          </div>
          <p className="text-[13px] text-ink-soft truncate max-w-md">{entry.rawContent}</p>
          <span className="text-[11px] text-ink-soft/60">{formatDate(entry.createdAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
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
    </li>
  );
}
