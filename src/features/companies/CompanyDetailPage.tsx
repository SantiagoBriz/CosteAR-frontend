import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import {
  Plus, FileSpreadsheet, ChevronRight, ArrowLeft, Users, Copy, Trash2, Eye, EyeOff, KeyRound,
  Edit2, Mic, MicOff, Sparkles, BookOpen, History, Table, FileDown, PenLine, Pencil, ImageIcon, RotateCcw,
  Package, Layers, DollarSign,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCompany, useCostStructures, useUpdateCompany, useDeleteCompany, useDeleteCostStructure, useRestoreCostStructure } from './company-hooks';
import { useCreateCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import { useOperators, useGenerateOperatorAccess, useRevokeOperator, useResetOperatorPassword, type GeneratedAccess } from '@/features/empresa-portal/empresa-portal-hooks';
import { useLedger, useDeleteLedgerEntry } from '@/features/libro/libro-hooks';
import { LedgerEntryModal } from '@/features/libro/LedgerEntryModal';
import { useHistorial } from '@/features/validaciones/validaciones-hooks';
import { api, apiErrorMessage } from '@/lib/api';
import { cn, formatMoney, formatDate } from '@/lib/utils';

const STATUS: Record<string, { label: string; status: 'ok' | 'warn' | 'idle' }> = {
  DRAFT: { label: 'Borrador', status: 'idle' },
  ACTIVE: { label: 'Activa', status: 'ok' },
  ARCHIVED: { label: 'Archivada', status: 'idle' },
};

export function CompanyDetailPage() {
  const { id } = useParams({ from: '/companies/$id' });
  const navigate = useNavigate();
  const { data: company } = useCompany(id);
  const { data: structures } = useCostStructures(id, true); // incluye las borradas (papelera)
  const delCompany = useDeleteCompany();
  const delStructure = useDeleteCostStructure(id);
  const restoreStructure = useRestoreCostStructure(id);

  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'structures' | 'ledger' | 'history' | 'operators'>('structures');
  // Confirmación de borrar / recuperar estructura.
  const [confirmStructure, setConfirmStructure] = useState<
    { id: string; productName: string; action: 'delete' | 'restore' } | null
  >(null);

  const runConfirmStructure = async () => {
    if (!confirmStructure) return;
    try {
      if (confirmStructure.action === 'delete') {
        await delStructure.mutateAsync(confirmStructure.id);
      } else {
        await restoreStructure.mutateAsync(confirmStructure.id);
      }
      setConfirmStructure(null);
    } catch {
      /* el error queda visible; el modal no se cierra */
    }
  };

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
      <Link to="/companies" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-granate transition-colors hover:text-action">
        <ArrowLeft className="size-4" /> Volver a clientes
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-line bg-surface p-6 shadow-[0_10px_30px_rgba(74,21,27,0.015)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-granate/10 bg-granate-tenue text-lg font-extrabold text-granate shadow-sm">
            {(company?.name ?? 'C')[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-extrabold tracking-tight text-ink">{company?.name ?? 'Cliente'}</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="rounded-xl p-1.5 text-ink-soft transition-colors hover:bg-granate-tenue hover:text-granate"
                  title="Editar Cliente"
                >
                  <Edit2 className="size-4" />
                </button>
                <button
                  onClick={handleDeleteCompany}
                  className="rounded-xl p-1.5 text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
                  title="Eliminar Cliente"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            {company?.industry && <p className="mt-0.5 text-[13px] text-ink-soft">{company.industry}</p>}
          </div>
        </div>
        {activeTab === 'structures' && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Nueva estructura
          </Button>
        )}
      </div>

      {showForm && <NewStructureForm companyId={id} onDone={() => setShowForm(false)} />}

      {/* Asistente de Configuración Inicial */}
      <AiSuggesterSection companyName={company?.name ?? ''} />

      {/* Tabs */}
      <div className="mb-6 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-surface p-1.5 shadow-sm">
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
                'flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-colors',
                active
                  ? 'bg-granate-tenue text-granate'
                  : 'text-ink-soft hover:text-ink'
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
            <CardHeader title="Estructuras de costos" description="Por producto y período" />
            <CardBody className="p-0">
              {!structures?.length ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  <p className="text-[13px] text-ink-soft">Sin estructuras de costos todavía.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {structures.map((s) => {
                    const isDeleted = !!s.deletedAt;
                    return (
                      <li key={s.id} className={cn('flex items-center justify-between gap-2 pr-4', isDeleted && 'bg-zinc-50/40')}>
                        {isDeleted ? (
                          <div className="flex flex-1 items-center gap-3.5 px-6 py-4">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-zinc-50 text-zinc-400">
                              <FileSpreadsheet className="size-5" />
                            </span>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="truncate font-bold text-ink-soft line-through">{s.productName}</div>
                                <div className="text-[12px] text-ink-soft/70">Período {s.period}</div>
                              </div>
                              <StatusBadge status="idle">En papelera</StatusBadge>
                            </div>
                          </div>
                        ) : (
                          <Link
                            to="/cost-structures/$id"
                            params={{ id: s.id }}
                            className="group flex flex-1 items-center gap-3.5 px-6 py-4 transition-colors hover:bg-zinc-50/15"
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate shadow-sm transition-transform duration-300 group-hover:scale-105">
                              <FileSpreadsheet className="size-5" />
                            </span>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="truncate font-bold text-ink transition-colors group-hover:text-granate">{s.productName}</div>
                                <div className="text-[12px] text-ink-soft">Período {s.period}</div>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                <StatusBadge status={STATUS[s.status]?.status ?? 'idle'}>
                                  {STATUS[s.status]?.label ?? s.status}
                                </StatusBadge>
                                <ChevronRight className="size-5 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </div>
                          </Link>
                        )}
                        {/* Acciones: borrar (activa) / recuperar (papelera) — con confirmación */}
                        {isDeleted ? (
                          <button
                            type="button"
                            title="Recuperar estructura"
                            onClick={() => setConfirmStructure({ id: s.id, productName: s.productName, action: 'restore' })}
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-action/10 hover:text-action"
                          >
                            <RotateCcw className="size-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Borrar estructura"
                            onClick={() => setConfirmStructure({ id: s.id, productName: s.productName, action: 'delete' })}
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
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

      <ConfirmDialog
        open={!!confirmStructure}
        tone={confirmStructure?.action === 'delete' ? 'danger' : 'default'}
        title={confirmStructure?.action === 'delete' ? 'Borrar estructura' : 'Recuperar estructura'}
        message={
          confirmStructure?.action === 'delete' ? (
            <>Vas a mandar a la papelera <strong className="text-ink">{confirmStructure?.productName}</strong>. Podés recuperarla después desde esta misma lista.</>
          ) : (
            <>Vas a recuperar <strong className="text-ink">{confirmStructure?.productName}</strong> de la papelera. Volverá a estar activa.</>
          )
        }
        confirmLabel={confirmStructure?.action === 'delete' ? 'Borrar' : 'Recuperar'}
        loading={delStructure.isPending || restoreStructure.isPending}
        onConfirm={runConfirmStructure}
        onCancel={() => setConfirmStructure(null)}
      />
    </AppShell>
  );
}

// ── Modulo Edit Company ──────────────────────────────────────────────────────
function EditCompanyModal({
  company,
  onClose,
}: {
  company: { id: string; name: string; industry: string | null; cuit?: string | null };
  onClose: () => void;
}) {
  const update = useUpdateCompany();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: {
      name: company.name,
      industry: company.industry ?? '',
      cuit: company.cuit ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: company.id,
        name: values.name,
        industry: values.industry || undefined,
        cuit: values.cuit || undefined,
      });
      onClose();
    } catch (e) {
      alert('Error al actualizar los datos: ' + apiErrorMessage(e));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-[28px] bg-surface p-6 shadow-2xl animate-rise border border-line">
        <h3 className="text-lg font-extrabold text-ink mb-4">Editar Cliente</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Razón Social" {...register('name', { required: true })} />
          <Input label="Sector / Actividad" {...register('industry')} />
          <Input label="CUIT (opcional)" {...register('cuit')} />
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
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'es-AR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setPromptText((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    rec.start();
    setRecognition(rec);
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setListening(false);
  };

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
    <Card className="mb-6">
      <CardHeader
        title="Asistente de Configuración Inicial"
        description="Describí el proceso de la empresa o dictalo por voz para recibir recomendaciones de modelado de costos en base a la cátedra de la UNT."
      />
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Ej: Es una panificadora familiar. Compran harina, levadura y grasa. Tienen 3 empleados en amasado y horneado, y el alquiler del local se distribuye entre producción y ventas..."
            className="flex-1 min-h-[80px] rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder-idle focus:border-granate focus:outline-none"
          />
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border transition-all",
              listening
                ? "bg-danger/10 text-danger border-danger/20 animate-pulse"
                : "bg-zinc-50 text-ink-soft border-line hover:bg-granate-tenue hover:text-granate"
            )}
            title={listening ? "Detener dictado" : "Dictar por voz"}
          >
            {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        </div>

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
          <div className="rounded-2xl border border-line bg-surface p-4 animate-rise text-ink text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
            <div className="flex items-center gap-2 font-bold text-ink mb-2">
              <Sparkles className="size-4 text-granate" />
              Sugerencia de Configuración
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
  const SECTION_ORDER = ['MATERIA_PRIMA', 'MANO_DE_OBRA', 'COSTOS_INDIRECTOS', 'VENTAS'];
  const SECTION_LABELS: Record<string, string> = {
    MATERIA_PRIMA: 'Materia Prima',
    MANO_DE_OBRA: 'Mano de Obra',
    COSTOS_INDIRECTOS: 'Costos Indirectos',
    VENTAS: 'Ventas',
  };

  const SECTION_ICON: Record<string, typeof Table> = {
    MATERIA_PRIMA: Package,
    MANO_DE_OBRA: Users,
    COSTOS_INDIRECTOS: Layers,
    VENTAS: DollarSign,
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
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none shadow-sm"
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
            <StatCard
              key={s}
              label={SECTION_LABELS[s] ?? s}
              value={formatMoney(data.totalsBySection[s])}
              sub="Total del período"
              icon={SECTION_ICON[s] ?? Table}
              variant="neutral"
            />
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-ink-soft">Cargando…</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
              <BookOpen className="size-6" />
            </div>
            <p className="text-sm font-bold text-ink">Sin costos registrados en este período</p>
            <p className="text-xs text-ink-soft">
              Aprobá documentos desde Validaciones o cargá líneas manualmente.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ section, items }) => (
            <Card key={section}>
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-zinc-50/15">
                <p className="text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">{SECTION_LABELS[section] ?? section}</p>
                <span className="text-[14px] font-bold tabular-nums text-granate">
                  {formatMoney(items.filter((i) => i.currency === 'ARS').reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-line">
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
            <img src={entry.sourceImageUrl} alt="comprobante" className="size-10 rounded-xl object-cover border border-line hover:opacity-80" />
          </button>
        ) : (
          <a href={entry.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-zinc-50 text-ink-soft hover:bg-granate-tenue hover:text-granate">
            <FileDown className="size-4" />
          </a>
        )
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-zinc-50 text-idle">
          <ImageIcon className="size-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{entry.description}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span>{entry.docDate ? formatDate(entry.docDate) : periodLabel(entry.period)}</span>
          {entry.wasCorrected && (
            <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700"><PenLine className="size-3" /> corregido</span>
          )}
          {entry.aiUsed && (
            <span className="flex items-center gap-0.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-purple-700">Auto</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[14px] font-semibold tabular-nums text-ink">
          {entry.currency !== 'ARS' && <span className="text-[11px] text-ink-soft">{entry.currency} </span>}
          {formatMoney(entry.amount)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onEdit(entry)} title="Editar" className="rounded-xl p-1.5 text-ink-soft hover:bg-granate-tenue hover:text-granate transition-colors">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={() => onDelete(entry)} title="Borrar" className="rounded-xl p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger transition-colors">
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
                        <div className="flex items-center gap-2 mb-1.5">
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
          <div className="mb-5 rounded-2xl border border-line bg-surface-alt p-4 animate-rise space-y-3">
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
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-[13px] text-danger">{generateError}</p>
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
          <div className="mb-5 rounded-2xl border border-action/30 bg-action/5 p-4 animate-rise">
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
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
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
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
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
          <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4 animate-rise">
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
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
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
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
              <Users className="size-6" />
            </div>
            <p className="text-[13px] text-ink-soft">Todavía no hay personal autorizado para esta empresa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {operators.map((op) => (
              <li key={op.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate shadow-sm">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{op.name}</p>
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
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
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
function NewStructureForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const create = useCreateCostStructure(companyId);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ productName: string; period: string; costingSystem: string }>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await create.mutateAsync(values);
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <Card className="mb-6 animate-rise">
      <CardBody>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Producto o Proceso" {...register('productName', { required: true })} />
          <Input label="Período (YYYY-MM)" placeholder="2026-06" {...register('period', { required: true })} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">Sistema de Costeo</label>
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none"
              {...register('costingSystem')}
            >
              <option value="ORDERS">Por Órdenes de Fabricación</option>
              <option value="PROCESSES">Por Procesos (Costeo Continuo)</option>
            </select>
          </div>
          {error && (
            <div className="sm:col-span-2 rounded-xl bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" loading={formState.isSubmitting}>
              Crear
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
