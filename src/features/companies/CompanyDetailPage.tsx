import { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { Edit2, Trash2, ArrowLeft, Users, FileSpreadsheet, BookOpen, History } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useCompany, useCostStructures, useDeleteCompany } from './company-hooks';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CompanyInfoForm } from './components/CompanyInfoForm';
import { AiSuggesterSection } from './components/AiSuggesterSection';
import { CompanyStructuresList } from './components/CompanyStructuresList';
import { CompanyLedgerTab } from './components/CompanyLedgerTab';
import { CompanyHistoryTab } from './components/CompanyHistoryTab';
import { CompanyOperatorsTab } from './components/CompanyOperatorsTab';

export function CompanyDetailPage() {
  const { id } = useParams({ from: '/companies/$id' });
  const navigate = useNavigate();
  const { data: company } = useCompany(id);
  const { data: structures } = useCostStructures(id);
  const delCompany = useDeleteCompany();
  
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
      <div className="mb-6 flex border-b border-zinc-200 overflow-x-auto">
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
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors border-transparent whitespace-nowrap',
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
          <CompanyStructuresList companyId={id} periodicity={company?.periodicity} structures={structures ?? []} />
        )}

        {activeTab === 'ledger' && (
          <CompanyLedgerTab companyId={id} companyName={company?.name ?? 'Cliente'} />
        )}

        {activeTab === 'history' && (
          <CompanyHistoryTab companyId={id} />
        )}

        {activeTab === 'operators' && (
          <CompanyOperatorsTab companyId={id} />
        )}
      </div>

      {/* Modals */}
      {showEditModal && company && (
        <CompanyInfoForm company={company} onClose={() => setShowEditModal(false)} />
      )}
    </AppShell>
  );
}
