import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Plus, FileSpreadsheet, ChevronRight, ArrowLeft } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCompany, useCostStructures } from './company-hooks';
import { useCreateCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import { apiErrorMessage } from '@/lib/api';

const STATUS: Record<string, { label: string; status: 'ok' | 'warn' | 'idle' }> = {
  DRAFT: { label: 'Borrador', status: 'idle' },
  ACTIVE: { label: 'Activa', status: 'ok' },
  ARCHIVED: { label: 'Archivada', status: 'idle' },
};

export function CompanyDetailPage() {
  const { id } = useParams({ from: '/companies/$id' });
  const { data: company } = useCompany(id);
  const { data: structures } = useCostStructures(id);
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell>
      <Link to="/companies" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-granate hover:text-action">
        <ArrowLeft className="size-4" /> Volver a clientes
      </Link>

      <PageHeader
        title={company?.name ?? 'Cliente'}
        description={company?.industry ?? undefined}
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Nueva estructura
          </Button>
        }
      />

      {showForm && <NewStructureForm companyId={id} onDone={() => setShowForm(false)} />}

      <Card>
        <CardHeader title="Estructuras de costos" description="Por producto y período" />
        <CardBody className="p-0">
          {!structures?.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <FileSpreadsheet className="size-8 text-idle" />
              <p className="text-sm text-ink-soft">Sin estructuras de costos todavía.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {structures.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/cost-structures/$id"
                    params={{ id: s.id }}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-alt"
                  >
                    <div>
                      <div className="font-medium text-ink">{s.productName}</div>
                      <div className="text-[13px] text-ink-soft">Período {s.period}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={STATUS[s.status]?.status ?? 'idle'}>
                        {STATUS[s.status]?.label ?? s.status}
                      </StatusBadge>
                      <ChevronRight className="size-5 text-idle" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}

function NewStructureForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const create = useCreateCostStructure(companyId);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ productName: string; period: string }>();

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
          <Input label="Producto" {...register('productName', { required: true })} />
          <Input label="Período (YYYY-MM)" placeholder="2026-06" {...register('period', { required: true })} />
          {error && (
            <div className="sm:col-span-2 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">
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
