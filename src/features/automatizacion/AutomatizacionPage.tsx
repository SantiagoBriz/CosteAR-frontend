import { useQuery } from '@tanstack/react-query';
import { FileText, Image, MessageSquare, FileInput, Clock, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ─── tipos ──────────────────────────────────────────────────────────────────

type DataEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
type DataEntrySourceType = 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';

interface DataEntry {
  id: string;
  status: DataEntryStatus;
  sourceType: DataEntrySourceType;
  fileName: string | null;
  rawContent: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  connection: {
    empresa: { id: string; name: string };
  };
  submittedBy?: null;
}

interface FeedResponse {
  data: DataEntry[];
  total: number;
}

// ─── config visual ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DataEntryStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING:   { label: 'Pendiente', color: 'bg-yellow-50 text-yellow-700',  icon: Clock },
  APPROVED:  { label: 'Aprobado',  color: 'bg-green-50 text-green-700',    icon: CheckCircle2 },
  REJECTED:  { label: 'Rechazado', color: 'bg-danger/10 text-danger',      icon: XCircle },
  CORRECTED: { label: 'Corregido', color: 'bg-action/10 text-action',      icon: RotateCcw },
};

const SOURCE_CONFIG: Record<DataEntrySourceType, { label: string; icon: typeof FileText }> = {
  TEXT:      { label: 'Texto',     icon: FileText },
  PDF:       { label: 'PDF',       icon: FileInput },
  IMAGE:     { label: 'Imagen',    icon: Image },
  WHATSAPP:  { label: 'WhatsApp',  icon: MessageSquare },
};

// ─── componente principal ───────────────────────────────────────────────────

export function AutomatizacionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['automatizacion', 'feed'],
    queryFn: async () => {
      const res = await api.get<FeedResponse>('/validaciones/feed');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const entries = data?.data ?? [];
  const pending  = entries.filter((e) => e.status === 'PENDING').length;
  const approved = entries.filter((e) => e.status === 'APPROVED').length;
  const rejected = entries.filter((e) => e.status === 'REJECTED').length;

  return (
    <AppShell>
      <PageHeader
        title="Centro de automatización"
        description="Flujo de documentación recibida desde las empresas vía operadores"
      />

      {/* KPIs rápidos */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Pendientes de revisión" value={pending}  color="text-yellow-600" />
        <KpiCard label="Aprobados"               value={approved} color="text-green-600" />
        <KpiCard label="Rechazados"               value={rejected} color="text-danger" />
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando actividad…</p>
      ) : !entries.length ? (
        <Card>
          <CardBody className="py-16 text-center">
            <p className="text-sm text-ink-soft">
              Todavía no hay envíos. Invitá a un operador desde la página de cada empresa para
              que empiece a cargar documentación.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Actividad reciente"
            description={`${entries.length} envíos · actualiza cada 30 s`}
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {entries.map((entry) => (
                <FeedRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </AppShell>
  );
}

// ─── sub-componentes ────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className={cn('text-3xl font-bold tabular', color)}>{value}</div>
        <div className="text-[13px] text-ink-soft">{label}</div>
      </CardBody>
    </Card>
  );
}

function FeedRow({ entry }: { entry: DataEntry }) {
  const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.PENDING;
  const sourceCfg = SOURCE_CONFIG[entry.sourceType] ?? SOURCE_CONFIG.TEXT;
  const StatusIcon = statusCfg.icon;
  const SourceIcon = sourceCfg.icon;

  return (
    <li className="flex items-start gap-4 px-6 py-4 hover:bg-surface-alt/40">
      {/* ícono fuente */}
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-ink-soft">
        <SourceIcon className="size-4" />
      </div>

      {/* contenido */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{entry.connection.empresa.name}</span>
          <span className="text-[12px] text-ink-soft">·</span>
          <span className="text-[12px] text-ink-soft">{sourceCfg.label}</span>
          {entry.fileName && (
            <>
              <span className="text-[12px] text-ink-soft">·</span>
              <span className="max-w-[200px] truncate text-[12px] text-ink-soft">{entry.fileName}</span>
            </>
          )}
        </div>

        {/* preview de contenido */}
        <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-soft/80">
          {entry.rawContent}
        </p>

        {/* nota de revisión */}
        {entry.reviewNote && (
          <p className="mt-1 text-[12px] text-action">
            Nota: {entry.reviewNote}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-soft/60">
          <span>{formatDate(entry.createdAt)}</span>
          {entry.reviewedAt && (
            <span>· revisado {formatDate(entry.reviewedAt)}</span>
          )}
        </div>
      </div>

      {/* badge de estado */}
      <div
        className={cn(
          'mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
          statusCfg.color,
        )}
      >
        <StatusIcon className="size-3" />
        {statusCfg.label}
      </div>
    </li>
  );
}
