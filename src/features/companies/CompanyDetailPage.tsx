import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import {
  Plus, FileSpreadsheet, ChevronRight, ArrowLeft, Users, Copy, Trash2, Eye, EyeOff, KeyRound,
  Edit2, Mic, MicOff, Sparkles, BookOpen, History, Table, FileDown, PenLine, Pencil, ImageIcon,
  CalendarClock
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCompany, useCostStructures, useUpdateCompany, useDeleteCompany } from './company-hooks';
import { useCreateCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import { useOperators, useGenerateOperatorAccess, useRevokeOperator, useResetOperatorPassword, type GeneratedAccess } from '@/features/empresa-portal/empresa-portal-hooks';
import { useLedger, useDeleteLedgerEntry } from '@/features/libro/libro-hooks';
import { LedgerEntryModal } from '@/features/libro/LedgerEntryModal';
import { useHistorial } from '@/features/validaciones/validaciones-hooks';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, formatMoney, formatDate } from '@/lib/utils';
import { PERIODICITY_OPTIONS, PERIODICITY_LABEL, type Periodicity } from '@/lib/types';
import { useDictation } from '@/lib/use-dictation';

const STATUS: Record<string, { label: string; status: 'ok' | 'warn' | 'idle' }> = {
  DRAFT: { label: 'Borrador', status: 'idle' },
  ACTIVE: { label: 'Activa', status: 'ok' },
  ARCHIVED: { label: 'Archivada', status: 'idle' },
};

export function CompanyDetailPage() {
  const { id } = useParams({ from: '/companies/$id' });
  const navigate = useNavigate();
  const { data: company } = useCompany(id);
  const { data: structures } = useCostStructures(id);
  const delCompany = useDeleteCompany();
  
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'structures' | 'ledger' | 'history' | 'operators'>('structures');

  const handleDeleteCompany = async () => {
    if (window.confirm(`¿Estás seguro de eliminar a ${company?.name}? Esta acción eliminará permanentemente la empresa, todas sus estructuras de costos, libro de costos, firmas y operadores vinculados.`)) {
      try {
        await delCompany.mutateAsync(id);
        navigate({ to: '/companies' });
      } catch (e) {
        alert('Error al eliminar la empresa: ' + apiErrorMessage(e));
      }
    }
  };

  return (
    <AppShell>
      <Link to="/companies" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-granate hover:text-action">
        <ArrowLeft className="size-4" /> Volver a clientes
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-zinc-950">{company?.name ?? 'Cliente'}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditModal(true)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                title="Editar Cliente"
              >
                <Edit2 className="size-4" />
              </button>
              <button
                onClick={handleDeleteCompany}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Eliminar Cliente"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          {company?.industry && <p className="mt-1 text-sm text-zinc-500">{company.industry}</p>}
        </div>
      </div>

      {/* Asistente de Configuración Inicial (IA) */}
      <AiSuggesterSection companyName={company?.name ?? ''} />

      {/* Tabs */}
      <div className="mb-6 flex border-b border-zinc-200">
        {[
          { id: 'structures', label: 'Estructuras de Costos', icon: FileSpreadsheet },
          { id: 'ledger', label: 'Libro de Costos', icon: BookOpen },
          { id: 'history', label: 'Historial', icon: History },
          { id: 'operators', label: 'Personal Autorizado', icon: Users },
        ].map((t) => {
          const ActiveIcon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors border-transparent',
                active
                  ? 'border-granate text-granate font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              <ActiveIcon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {activeTab === 'structures' && (
          <Card>
            {/* El botón vive acá, junto a la lista que va a modificar — no en el header
                de la página, donde no tenía contexto. */}
            <CardHeader
              title="Estructuras de costos"
              description="Por producto y período"
              action={
                <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                  <Plus className="size-4" /> Nueva estructura
                </Button>
              }
            />
            {showForm && (
              <div className="border-b border-zinc-100 px-6 py-5">
                <NewStructureForm
                  companyId={id}
                  periodicity={company?.periodicity}
                  onDone={() => setShowForm(false)}
                />
              </div>
            )}
            <CardBody className="p-0">
              {!structures?.length ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <FileSpreadsheet className="size-8 text-zinc-300" />
                  <p className="text-sm text-zinc-400">Sin estructuras de costos todavía.</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {structures.map((s) => (
                    <li key={s.id}>
                      <Link
                        to="/cost-structures/$id"
                        params={{ id: s.id }}
                        className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-zinc-50"
                      >
                        <div>
                          <div className="font-medium text-zinc-800">{s.productName}</div>
                          <div className="text-[13px] text-zinc-400">Período {s.period}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={STATUS[s.status]?.status ?? 'idle'}>
                            {STATUS[s.status]?.label ?? s.status}
                          </StatusBadge>
                          <ChevronRight className="size-5 text-zinc-300" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'ledger' && (
          <LedgerTabSection companyId={id} companyName={company?.name ?? 'Cliente'} />
        )}

        {activeTab === 'history' && (
          <HistoryTabSection companyId={id} />
        )}

        {activeTab === 'operators' && (
          <OperatorsSection companyId={id} />
        )}
      </div>

      {/* Modals */}
      {showEditModal && company && (
        <EditCompanyModal company={company} onClose={() => setShowEditModal(false)} />
      )}
    </AppShell>
  );
}

// ── Modulo Edit Company ──────────────────────────────────────────────────────
function EditCompanyModal({
  company,
  onClose,
}: {
  company: {
    id: string;
    name: string;
    industry: string | null;
    cuit?: string | null;
    periodicity?: Periodicity;
  };
  onClose: () => void;
}) {
  const update = useUpdateCompany();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: {
      name: company.name,
      industry: company.industry ?? '',
      cuit: company.cuit ?? '',
      periodicity: company.periodicity ?? ('MONTHLY' as Periodicity),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: company.id,
        name: values.name,
        industry: values.industry || undefined,
        cuit: values.cuit || undefined,
        periodicity: values.periodicity,
      });
      onClose();
    } catch (e) {
      alert('Error al actualizar los datos: ' + apiErrorMessage(e));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-rise border border-zinc-150">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">Editar Cliente</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Razón Social" {...register('name', { required: true })} />
          <Input label="Sector / Actividad" {...register('industry')} />
          <Input label="CUIT (opcional)" {...register('cuit')} />
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">
              Ritmo de costeo
            </label>
            <select
              {...register('periodicity')}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-granate focus:outline-none focus:ring-2 focus:ring-granate/10"
            >
              {PERIODICITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-400">
              Solo se puede cambiar mientras la empresa no tenga ningún período cargado.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={formState.isSubmitting}>Guardar Cambios</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modulo AI Suggester ──────────────────────────────────────────────────────
function AiSuggesterSection({ companyName }: { companyName: string }) {
  const [promptText, setPromptText] = useState('');
  const [suggs, setSuggs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dictado = useDictation((chunk) =>
    setPromptText((prev) => (prev.trim() ? `${prev} ${chunk}` : chunk)),
  );

  const handleSuggest = async () => {
    if (!promptText.trim()) return;
    setLoading(true);
    setSuggs(null);
    try {
      const res = await api.post<{ data: { reply: string } }>('/costista-chat/interpret', {
        message: `Dada la siguiente descripción de mi cliente "${companyName}", sugerí detalladamente cómo estructurar su costeo en CosteAR. Incluí sugerencias específicas para Materia Prima (valuación PPP, lote óptimo, etc.), Mano de Obra (cargas sociales, ITCS, incentivos) y Costos Indirectos (prorrateo dual fijo/variable por centro productivo/servicio): ${promptText}`,
      });
      setSuggs(res.data.data.reply);
    } catch (e) {
      alert('No se pudo obtener sugerencias. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-zinc-200 shadow-xs bg-zinc-50/20">
      <CardHeader
        title="Asistente de Configuración Inicial (IA)"
        description="Describí el proceso de la empresa o dictalo por voz para recibir recomendaciones de modelado de costos en base a la cátedra de la UNT."
      />
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Ej: Es una panificadora familiar. Compran harina, levadura y grasa. Tienen 3 empleados en amasado y horneado, y el alquiler del local se distribuye entre producción y ventas..."
            className="flex-1 min-h-[80px] rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-855 placeholder-zinc-400 focus:border-granate focus:outline-none"
          />
          <button
            type="button"
            onClick={dictado.toggle}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-all",
              dictado.listening
                ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100"
            )}
            title={dictado.listening ? "Detener el dictado" : "Dictar por voz"}
          >
            {dictado.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        </div>

        {dictado.listening && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-granate">
            <span className="inline-block size-1.5 rounded-full bg-granate animate-ping" />
            Escuchando… hablá tranquilo, podés frenar a pensar.
          </p>
        )}
        {dictado.error && <p className="text-xs text-danger">{dictado.error}</p>}

        <div className="flex justify-end">
          <Button
            onClick={handleSuggest}
            loading={loading}
            disabled={!promptText.trim()}
            className="flex items-center gap-2"
          >
            <Sparkles className="size-4" />
            Analizar y Sugerir
          </Button>
        </div>

        {suggs && (
          <div className="rounded-xl border border-zinc-150 bg-white p-4 animate-rise text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap shadow-xs">
            <div className="flex items-center gap-2 font-bold text-zinc-800 mb-2">
              <Sparkles className="size-4 text-granate" />
              Sugerencia de Configuración IA
            </div>
            {suggs}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Modulo Libro de Costos (Tab) ─────────────────────────────────────────────
function LedgerTabSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [period, setPeriod] = useState<string>('');
  const { data, isLoading } = useLedger(companyId, period || undefined);
  const del = useDeleteLedgerEntry();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  const handleDelete = async (e: any) => {
    if (window.confirm(`¿Borrar "${e.description}" (${formatMoney(e.amount)})? Esto no se puede deshacer.`)) {
      await del.mutateAsync(e.id);
    }
  };

  const entries = data?.entries ?? [];
  const SECTION_ORDER = [
    'MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS',
    'GASTO_COMERCIALIZACION', 'GASTO_ADMINISTRACION', 'GASTO_FINANCIERO',
  ];
  const SECTION_LABELS: Record<string, string> = {
    MATERIA_PRIMA: 'Materia Prima',
    MANO_DE_OBRA: 'Mano de Obra',
    COSTOS_INDIRECTOS: 'Costos Indirectos',
    VENTAS: 'Ventas',
    GASTO_COMERCIALIZACION: 'Gasto de Comercialización',
    GASTO_ADMINISTRACION: 'Gasto de Administración',
    GASTO_FINANCIERO: 'Gasto Financiero',
  };

  const grouped = SECTION_ORDER
    .map((s) => ({ section: s, items: entries.filter((e) => e.costSection === s) }))
    .filter((g) => g.items.length > 0);

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const periodLabel = (p: string) => {
    const [y, m] = p.split('-');
    return `${months[Number(m) - 1] ?? m} ${y}`;
  };

  const handleExport = () => {
    const headers = ['Periodo', 'Fecha', 'Seccion', 'Tipo', 'Proveedor', 'Descripcion', 'Monto', 'Moneda'];
    const rows = entries.map((e) => [
      e.period,
      e.docDate ? new Date(e.docDate).toLocaleDateString('es-AR') : '',
      SECTION_LABELS[e.costSection] ?? e.costSection,
      e.documentType,
      e.supplier ?? '',
      e.description.replace(/"/g, '""'),
      String(e.amount),
      e.currency,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro-costos-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-granate focus:outline-none shadow-xs"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="">Todos los períodos</option>
          {(data?.periods ?? []).map((p) => (
            <option key={p} value={p}>{periodLabel(p)}</option>
          ))}
        </select>
        <div className="flex gap-2 font-medium">
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Agregar Manual
          </Button>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleExport}>
              <Table className="size-4" /> Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Totales */}
      {data && Object.keys(data.totalsBySection).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-rise">
          {SECTION_ORDER.filter((s) => data.totalsBySection[s] != null).map((s) => (
            <div key={s} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-semibold">{SECTION_LABELS[s]}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-zinc-850">{formatMoney(data.totalsBySection[s])}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-zinc-400">Cargando…</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 size-8 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-800">Sin costos registrados en este período</p>
            <p className="mt-1 text-xs text-zinc-400">
              Aprobá documentos desde Validaciones o cargá líneas manualmente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ section, items }) => (
            <Card key={section}>
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 bg-zinc-50/50">
                <p className="text-[14px] font-bold text-zinc-800">{SECTION_LABELS[section] ?? section}</p>
                <span className="text-[14px] font-bold tabular-nums text-granate">
                  {formatMoney(items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-zinc-100">
                {items.map((e) => (
                  <LedgerRow key={e.id} entry={e} onZoom={setLightbox} onEdit={setEditing} onDelete={handleDelete} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(adding || editing) && (
        <LedgerEntryModal
          entry={editing ?? undefined}
          companyId={companyId}
          defaultPeriod={period || undefined}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Comprobante" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(ev) => ev.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 size-9 rounded-full bg-black/50 text-lg text-white hover:bg-black/70">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Ledger Row ───────────────────────────────────────────────────────────────
function LedgerRow({
  entry,
  onZoom,
  onEdit,
  onDelete,
}: {
  entry: any;
  onZoom: (src: string) => void;
  onEdit: (e: any) => void;
  onDelete: (e: any) => void;
}) {
  const isImage = entry.sourceImageUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(entry.sourceImageUrl);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const periodLabel = (p: string) => {
    const [y, m] = p.split('-');
    return `${months[Number(m) - 1] ?? m} ${y}`;
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {entry.sourceImageUrl ? (
        isImage ? (
          <button type="button" onClick={() => onZoom(entry.sourceImageUrl!)} className="shrink-0">
            <img src={entry.sourceImageUrl} alt="comprobante" className="size-10 rounded object-cover border border-zinc-200 hover:opacity-80" />
          </button>
        ) : (
          <a href={entry.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100">
            <FileDown className="size-4" />
          </a>
        )
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-400">
          <ImageIcon className="size-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-zinc-800">{entry.description}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span>{entry.docDate ? formatDate(entry.docDate) : periodLabel(entry.period)}</span>
          {entry.wasCorrected && (
            <span className="flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700"><PenLine className="size-3" /> corregido</span>
          )}
          {entry.aiUsed && (
            <span className="flex items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">IA</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[14px] font-semibold tabular-nums text-zinc-800">
          {entry.currency !== 'ARS' && <span className="text-[11px] text-zinc-400">{entry.currency} </span>}
          {formatMoney(entry.amount)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onEdit(entry)} title="Editar" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-150 hover:text-zinc-800 transition-colors">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={() => onDelete(entry)} title="Borrar" className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Modulo Historial (Tab) ───────────────────────────────────────────────────
function HistoryTabSection({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistorial(page, companyId);

  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    APPROVED: { label: 'Aprobada', className: 'text-green-700 bg-green-50 border-green-200' },
    REJECTED: { label: 'Rechazada', className: 'text-red-700 bg-red-50 border-red-200' },
    CORRECTED: { label: 'Corregida', className: 'text-blue-700 bg-blue-50 border-blue-200' },
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="py-12 text-center text-sm text-zinc-400">Cargando…</div>
      ) : !data?.items.length ? (
        <Card>
          <CardBody className="py-12 text-center">
            <History className="mx-auto mb-3 size-8 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-800">Sin historial de validaciones</p>
            <p className="mt-1 text-xs text-zinc-400">
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
              <ul className="divide-y divide-zinc-100">
                {data.items.map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status];
                  return (
                    <li key={entry.id} className="flex items-start justify-between gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                            cfg?.className
                          )}>
                            {cfg?.label ?? entry.status}
                          </span>
                          <span className="text-[11px] text-zinc-400">{entry.fileName ?? 'Texto libre'}</span>
                        </div>
                        <p className="text-[13px] text-zinc-700 font-medium leading-relaxed">
                          {entry.correctedContent ?? entry.rawContent}
                        </p>
                        {entry.reviewNote && (
                          <p className="mt-1.5 text-xs text-zinc-500 italic bg-zinc-50 border-l-2 border-zinc-200 px-2 py-1">
                            "{entry.reviewNote}"
                          </p>
                        )}
                        <div className="mt-2 flex gap-4 text-[11px] text-zinc-400">
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
              <span className="text-xs text-zinc-500">Página {page} de {Math.ceil(data.total / 20)}</span>
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

// ── Modulo Personal Autorizado (Original) ────────────────────────────────────
function OperatorsSection({ companyId }: { companyId: string }) {
  const { data: operators = [] } = useOperators(companyId);
  const generate = useGenerateOperatorAccess(companyId);
  const revoke = useRevokeOperator();
  const reset = useResetOperatorPassword();
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [operatorFullName, setOperatorFullName] = useState('');
  const [operatorRole, setOperatorRole] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(operatorEmail);

  const handleGenerate = async () => {
    if (!operatorFullName.trim() || !emailValid) return;
    setGenerateError(null);
    const displayName = operatorRole.trim()
      ? `${operatorFullName.trim()} — ${operatorRole.trim()}`
      : operatorFullName.trim();
    try {
      const result = await generate.mutateAsync({ operatorName: displayName, operatorEmail: operatorEmail.trim() });
      setGeneratedAccess(result);
      setOperatorFullName('');
      setOperatorRole('');
      setOperatorEmail('');
      setShowForm(false);
    } catch (e) {
      setGenerateError(apiErrorMessage(e));
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = async (operatorId: string) => {
    try {
      const result = await reset.mutateAsync(operatorId);
      setResetResult(result);
      setGeneratedAccess(null);
    } catch {
      // error silently
    }
  };

  return (
    <Card>
      <CardHeader
        title="Personal autorizado"
        description="Usuarios de esta empresa que pueden cargar documentos al portal"
        action={
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Invitar operador
          </Button>
        }
      />
      <CardBody>
        {/* Formulario de invitación */}
        {showForm && (
          <div className="mb-5 rounded-md bg-surface-alt p-4 animate-rise space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre completo"
                placeholder="Ej: María García"
                value={operatorFullName}
                onChange={(e) => setOperatorFullName(e.target.value)}
              />
              <Input
                label="Cargo / área (opcional)"
                placeholder="Ej: Compras, Administración…"
                value={operatorRole}
                onChange={(e) => setOperatorRole(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Email"
                type="email"
                placeholder="maria@empresa.com"
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
              />
              {operatorEmail.length > 0 && !emailValid && (
                <p className="mt-1 text-[12px] text-danger">Email inválido</p>
              )}
            </div>
            <p className="text-[12px] text-ink-soft">
              El operador recibirá un email con sus credenciales temporales y podrá cambiar su contraseña al ingresar.
            </p>
            {generateError && (
              <p className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{generateError}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleGenerate} loading={generate.isPending} disabled={!operatorFullName.trim() || !emailValid}>
                Generar acceso y enviar invitación
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Credenciales generadas */}
        {generatedAccess && (
          <div className="mb-5 rounded-md border border-action/30 bg-action/5 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso generado — compartí estas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CredField
                label="Email / Usuario"
                value={generatedAccess.email}
                copied={copied === 'email'}
                onCopy={() => copyText(generatedAccess.email, 'email')}
              />
              {generatedAccess.tempPassword ? (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                    Contraseña temporal
                  </label>
                  <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                    <span className="flex-1 font-mono text-sm text-ink">
                      {showPassword ? generatedAccess.tempPassword : '••••••••••••'}
                    </span>
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(generatedAccess.tempPassword!, 'pass')}
                      className={cn('text-ink-soft hover:text-ink', copied === 'pass' && 'text-green-600')}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                    Código de invitación
                  </label>
                  <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                    <span className="flex-1 font-mono text-sm text-ink">{generatedAccess.inviteCode ?? '—'}</span>
                    <button
                      type="button"
                      onClick={() => copyText(generatedAccess.inviteCode ?? '', 'pass')}
                      className={cn('text-ink-soft hover:text-ink', copied === 'pass' && 'text-green-600')}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">El operador ya tiene cuenta — que acepte este código desde su perfil.</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              {generatedAccess.tempPassword
                ? <>El operador iniciará sesión con estas credenciales y verá solo la pantalla de carga de documentos.</>
                : 'Se envió un email al operador con el código de invitación.'}
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setGeneratedAccess(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {/* Credenciales reseteadas */}
        {resetResult && (
          <div className="mb-5 rounded-md border border-amber-400/40 bg-amber-50/60 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso reseteado — compartí las nuevas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CredField
                label="Email / Usuario"
                value={resetResult.email}
                copied={copied === 'reset-email'}
                onCopy={() => copyText(resetResult.email, 'reset-email')}
              />
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                  Nueva contraseña temporal
                </label>
                <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                  <span className="flex-1 font-mono text-sm text-ink">
                    {showPassword ? resetResult.tempPassword : '••••••••••••'}
                  </span>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(resetResult.tempPassword, 'reset-pass')}
                    className={cn('text-ink-soft hover:text-ink', copied === 'reset-pass' && 'text-green-600')}
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              El operador deberá cambiar su contraseña al ingresar por primera vez con estas credenciales.
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setResetResult(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {/* Lista de operadores */}
        {operators.length === 0 && !showForm ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="size-8 text-ink-soft/40" />
            <p className="text-[13px] text-ink-soft">Todavía no hay personal autorizado para esta empresa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {operators.map((op) => (
              <li key={op.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-surface-alt text-ink-soft">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{op.name}</p>
                    <p className="text-[12px] text-ink-soft">{op.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={op.isActive ? 'ok' : 'idle'}>
                    {op.isActive ? 'Activo' : 'Revocado'}
                  </StatusBadge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-600 hover:bg-amber-50"
                    onClick={() => handleReset(op.id)}
                    loading={reset.isPending}
                    title="Resetear acceso"
                  >
                    <KeyRound className="size-4" />
                  </Button>
                  {op.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => revoke.mutate(op.id)}
                      loading={revoke.isPending}
                      title="Revocar acceso"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function CredField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">{label}</label>
      <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
        <span className="flex-1 font-mono text-sm text-ink">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className={cn('text-ink-soft hover:text-ink', copied && 'text-green-600')}
        >
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Alta de estructura. El PERÍODO ya no se tipea.
 *
 * Antes había que escribir "2026-06" a mano, lo que obligaba a inventar un código
 * mensual incluso para una empresa que cierra por quincena o por trimestre. Ahora el
 * backend lo deriva de la fecha de hoy leída con el ritmo de la empresa, y de ahí en
 * más los períodos se abren y se cierran desde la pantalla de la estructura.
 */
function NewStructureForm({
  companyId,
  periodicity,
  onDone,
}: {
  companyId: string;
  periodicity?: Periodicity;
  onDone: () => void;
}) {
  const create = useCreateCostStructure(companyId);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ productName: string }>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await create.mutateAsync({ productName: values.productName });
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} className="animate-rise space-y-4">
      <Input label="Producto" placeholder="Ej: Mesa de roble" {...register('productName', { required: true })} />

      <div className="flex items-start gap-2.5 rounded-lg bg-zinc-50 border border-zinc-100 px-3.5 py-3">
        <CalendarClock className="size-4 shrink-0 text-zinc-400 mt-0.5" />
        <p className="text-[13px] text-zinc-500 leading-relaxed">
          El período de arranque lo pone el sistema: el que corre hoy según el ritmo{' '}
          <strong className="text-zinc-700">
            {periodicity ? PERIODICITY_LABEL[periodicity].toLowerCase() : 'de costeo'}
          </strong>{' '}
          de esta empresa. Después lo cerrás y abrís el siguiente desde la pantalla de
          la estructura.
        </p>
      </div>

      {error && (
        <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={formState.isSubmitting}>
          Crear
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
