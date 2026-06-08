import { useState } from 'react';
import { CheckCircle2, XCircle, PenLine, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useHistorial, type DataEntry } from './validaciones-hooks';
import { formatDate } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  APPROVED: { label: 'Aprobada', icon: CheckCircle2, className: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Rechazada', icon: XCircle, className: 'text-danger bg-danger/10' },
  CORRECTED: { label: 'Corregida', icon: PenLine, className: 'text-action bg-action/10' },
};

export function HistorialPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistorial(page);

  return (
    <AppShell>
      <PageHeader
        title="Historial"
        description="Todas las entradas ya revisadas — aprobadas, rechazadas o corregidas"
      />

      {isLoading ? (
        <div className="py-16 text-center text-sm text-ink-soft">Cargando…</div>
      ) : !data?.items.length ? (
        <Card>
          <CardBody className="py-16 text-center">
            <History className="mx-auto mb-3 size-10 text-ink-soft/40" />
            <p className="text-sm font-medium text-ink">Sin historial todavía</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Las entradas que revises aparecerán acá.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title={`${data.total} entradas`}
              description="Ordenadas por fecha de revisión"
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-line">
                {data.items.map((entry) => (
                  <HistorialRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </CardBody>
          </Card>

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

function HistorialRow({ entry }: { entry: DataEntry }) {
  const cfg = STATUS_CONFIG[entry.status];
  const Icon = cfg?.icon ?? CheckCircle2;

  return (
    <li className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md', cfg?.className)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm text-ink">{entry.connection.company.name}</span>
            <span
              className={cn(
                'rounded-sm px-1.5 py-0.5 text-[11px] font-medium',
                cfg?.className,
              )}
            >
              {cfg?.label ?? entry.status}
            </span>
          </div>
          <p className="text-[13px] text-ink-soft truncate max-w-md">
            {entry.correctedContent ?? entry.rawContent}
          </p>
          {entry.reviewNote && (
            <p className="mt-0.5 text-[12px] text-ink-soft/70 italic">"{entry.reviewNote}"</p>
          )}
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-ink-soft/60">
            <span>Cargada: {formatDate(entry.createdAt)}</span>
            {entry.reviewedAt && <span>Revisada: {formatDate(entry.reviewedAt)}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}
