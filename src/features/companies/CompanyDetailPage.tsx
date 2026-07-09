import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import {
  Plus, FileSpreadsheet, ChevronRight, ArrowLeft, Users, Trash2, Edit2, RotateCcw,
  BookOpen, History,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCompany, useCostStructures, useDeleteCompany, useDeleteCostStructure, useRestoreCostStructure } from './company-hooks';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

// Import sub-components
import { EditCompanyModal } from './components/EditCompanyModal';
import { AiSuggesterSection } from './components/AiSuggesterSection';
import { LedgerTabSection } from './components/LedgerTabSection';
import { HistoryTabSection } from './components/HistoryTabSection';
import { OperatorsSection } from './components/OperatorsSection';
import { NewStructureForm } from './components/NewStructureForm';

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
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-granate/10 bg-granate-tenue text-lg font-extrabold text-granate shadow-sm">
            {(company?.name ?? 'C')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-[24px] font-extrabold tracking-tight text-ink">{company?.name ?? 'Cliente'}</h1>
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
      <div className="mb-6 overflow-x-auto scrollbar-hidden">
        <div className="inline-flex flex-nowrap items-center gap-1.5 rounded-full border border-line bg-surface p-1.5 shadow-sm">
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
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-colors',
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
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
