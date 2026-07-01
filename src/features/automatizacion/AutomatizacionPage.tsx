/**
 * Centro de Automatización — Flujo de documentos recibidos de los operadores.
 *
 * Muestra:
 *  - Diagrama del pipeline de procesamiento (4 pasos)
 *  - KPIs de la sesión actual
 *  - Feed de entradas con resultado del clasificador en tiempo real
 */

import { useQuery } from '@tanstack/react-query';
import {
  FileText, Image, MessageSquare, FileInput, Clock, CheckCircle2,
  XCircle, RotateCcw, Webhook, BrainCircuit, ShieldCheck, Bell,
  ArrowRight, Zap, AlertTriangle, Cpu, RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── tipos ──────────────────────────────────────────────────────────────────

type DataEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
type DataEntrySourceType = 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';

interface ClassificationAudit {
  documentType: string;
  costSection: string;
  confidence: number;
  requiresReview: boolean;
  aiUsed: boolean;
  definitiveSignal: string | null;
  explanation: string | null;
}

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
    company: { id: string; name: string; industry: string | null };
  };
  classificationAudits: ClassificationAudit[];
}

interface FeedResponse {
  data: DataEntry[];
  total: number;
}

// ─── config visual ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DataEntryStatus, { label: string; bg: string; text: string; icon: typeof Clock }> = {
  PENDING:   { label: 'Pendiente',  bg: 'bg-amber-50',   text: 'text-amber-700',  icon: Clock },
  APPROVED:  { label: 'Aprobado',   bg: 'bg-emerald-50', text: 'text-emerald-700',icon: CheckCircle2 },
  REJECTED:  { label: 'Rechazado',  bg: 'bg-red-50',     text: 'text-red-700',    icon: XCircle },
  CORRECTED: { label: 'Corregido',  bg: 'bg-blue-50',    text: 'text-blue-700',   icon: RotateCcw },
};

const SOURCE_CONFIG: Record<DataEntrySourceType, { label: string; icon: typeof FileText }> = {
  TEXT:     { label: 'Texto',    icon: FileText },
  PDF:      { label: 'PDF',      icon: FileInput },
  IMAGE:    { label: 'Imagen',   icon: Image },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare },
};

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA:    'Mat. Prima',
  MANO_DE_OBRA:     'M. de Obra',
  COSTOS_INDIRECTOS:'C. Indirectos',
  VENTAS:           'Ventas',
  DESCONOCIDO:      'Sin sección',
};

const SECTION_COLORS: Record<string, string> = {
  MATERIA_PRIMA:    'bg-violet-100 text-violet-700',
  MANO_DE_OBRA:     'bg-blue-100 text-blue-700',
  COSTOS_INDIRECTOS:'bg-orange-100 text-orange-700',
  VENTAS:           'bg-emerald-100 text-emerald-700',
  DESCONOCIDO:      'bg-gray-100 text-gray-500',
};

// ─── pipeline steps ──────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    icon: Webhook,
    label: 'Ingesta',
    sub: 'Operador envía doc',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    icon: BrainCircuit,
    label: 'Clasificador',
    sub: '6 capas en cascada',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    icon: ShieldCheck,
    label: 'Validación',
    sub: 'Costista revisa',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    icon: Bell,
    label: 'Registro',
    sub: 'Entra a la estructura',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function confidenceColor(c: number) {
  if (c >= 80) return 'text-emerald-600 bg-emerald-50';
  if (c >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

// ─── componente principal ───────────────────────────────────────────────────

export function AutomatizacionPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['automatizacion', 'feed'],
    queryFn: async () => {
      const res = await api.get<FeedResponse>('/validaciones/feed');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const entries   = data?.data ?? [];
  const pending   = entries.filter((e) => e.status === 'PENDING').length;
  const approved  = entries.filter((e) => e.status === 'APPROVED').length;
  const rejected  = entries.filter((e) => e.status === 'REJECTED').length;
  const withAI    = entries.filter((e) => e.classificationAudits[0]?.aiUsed).length;
  const total     = entries.length;
  const autoRate  = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;

  return (
    <AppShell>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }} className="pb-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-end justify-between border-b border-gray-200 pb-6">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">Pipeline</p>
            <h1
              className="mt-0.5 text-[28px] font-extrabold text-gray-900"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Centro de Automatización
            </h1>
            <p className="mt-1 text-[13px] text-gray-500">
              Documentos clasificados automáticamente · actualiza cada 30s
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors',
              isFetching && 'opacity-60 pointer-events-none',
            )}
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Actualizar
          </button>
        </div>

        {/* ── Pipeline visual ───────────────────────────────────────────────── */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500" />
              <span className="text-[12px] font-semibold text-gray-700">Flujo activo: Ingesta de documentos contables</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-0 overflow-x-auto px-6 py-6">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 min-w-[90px]">
                  <div className={cn('flex size-12 items-center justify-center rounded-2xl border', step.color)}>
                    <step.icon className="size-5" />
                  </div>
                  <p className="text-[12px] font-semibold text-gray-700">{step.label}</p>
                  <p className="text-[10px] text-center text-gray-400 max-w-[80px]">{step.sub}</p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight className="mx-3 size-4 shrink-0 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total procesados" value={total} sub="en el historial" color="text-gray-800" icon={Zap} />
          <KpiCard label="Pendientes" value={pending} sub="requieren revisión" color="text-amber-600" icon={Clock} urgent={pending > 0} />
          <KpiCard label="Aprobados" value={approved} sub="registrados ok" color="text-emerald-600" icon={CheckCircle2} />
          <KpiCard label="Auto-clasificados" value={withAI} sub={`${autoRate}% auto-clasificados`} color="text-violet-600" icon={Cpu} />
        </div>

        {/* ── Feed ──────────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-800"
                style={{ fontFamily: "'Syne', sans-serif" }}>
                Actividad reciente
              </h2>
              <p className="text-[12px] text-gray-400">
                {total} documento{total !== 1 ? 's' : ''} · se actualiza automáticamente
              </p>
            </div>
            {rejected > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1">
                <AlertTriangle className="size-3 text-red-500" />
                <span className="text-[11px] font-semibold text-red-700">{rejected} rechazado{rejected !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="size-4 animate-spin" />
                <span className="text-[13px]">Cargando actividad…</span>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100">
                <Webhook className="size-7 text-gray-400" />
              </div>
              <p className="text-[14px] font-semibold text-gray-700">Sin actividad todavía</p>
              <p className="mt-1 max-w-xs text-[12px] text-gray-400">
                Invitá a un operador desde la página de cada empresa para que empiece a cargar documentación.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <FeedRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>

      </div>
    </AppShell>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon: Icon, urgent,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
  icon: typeof Zap;
  urgent?: boolean;
}) {
  return (
    <div className={cn(
      'relative rounded-2xl border bg-white p-5',
      urgent ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200',
    )}>
      {urgent && <span className="absolute right-4 top-4 size-2 rounded-full bg-amber-500" />}
      <Icon className={cn('mb-3 size-4', color)} />
      <p
        className={cn('text-[32px] font-extrabold leading-none tabular-nums', color)}
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12px] font-semibold text-gray-700">{label}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>
    </div>
  );
}

// ─── FeedRow ─────────────────────────────────────────────────────────────────

function FeedRow({ entry }: { entry: DataEntry }) {
  const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.PENDING;
  const sourceCfg = SOURCE_CONFIG[entry.sourceType] ?? SOURCE_CONFIG.TEXT;
  const StatusIcon = statusCfg.icon;
  const SourceIcon = sourceCfg.icon;
  const audit = entry.classificationAudits[0];

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors">
      {/* Ícono fuente */}
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <SourceIcon className="size-4" />
      </div>

      {/* Contenido */}
      <div className="min-w-0">
        {/* Empresa + fecha */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-gray-800">
            {entry.connection.company.name}
          </span>
          {entry.connection.company.industry && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {entry.connection.company.industry}
            </span>
          )}
          <span className="text-[11px] text-gray-400">{formatTime(entry.createdAt)}</span>
          {entry.fileName && (
            <span className="max-w-[160px] truncate text-[11px] text-gray-400">
              · {entry.fileName}
            </span>
          )}
        </div>

        {/* Preview del contenido */}
        <p className="mt-0.5 line-clamp-1 text-[12px] text-gray-500">
          {entry.rawContent}
        </p>

        {/* Resultado del clasificador */}
        {audit && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Sección de costos */}
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              SECTION_COLORS[audit.costSection] ?? SECTION_COLORS.DESCONOCIDO,
            )}>
              {SECTION_LABELS[audit.costSection] ?? audit.costSection}
            </span>

            {/* Tipo de documento */}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {audit.documentType}
            </span>

            {/* Confianza */}
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', confidenceColor(audit.confidence))}>
              {audit.confidence}% conf.
            </span>

            {/* IA usada */}
            {audit.aiUsed && (
              <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                <Cpu className="size-2.5" /> Auto
              </span>
            )}

            {/* Señal definitiva */}
            {audit.definitiveSignal && (
              <span className="text-[10px] text-gray-400">
                via {audit.definitiveSignal}
              </span>
            )}
          </div>
        )}

        {/* Nota de revisión */}
        {entry.reviewNote && (
          <p className="mt-1 text-[11px] font-medium text-blue-600">
            Nota: {entry.reviewNote}
          </p>
        )}
      </div>

      {/* Badge de estado */}
      <div className={cn(
        'mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        statusCfg.bg, statusCfg.text,
      )}>
        <StatusIcon className="size-3" />
        {statusCfg.label}
      </div>
    </li>
  );
}
