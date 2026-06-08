import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCompanies, useCreateCompany } from './company-hooks';
import { apiErrorMessage } from '@/lib/api';

export function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Clientes"
        description="Tu cartera de PyMEs"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Nuevo cliente
          </Button>
        }
      />

      {showForm && <NewCompanyForm onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : !companies?.length ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-granate-tenue text-granate">
              <Building2 className="size-6" />
            </div>
            <p className="text-sm text-ink-soft">Todavía no cargaste ningún cliente.</p>
            <Button onClick={() => setShowForm(true)} variant="secondary" size="sm">
              <Plus className="size-4" /> Agregar el primero
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {companies.map((c) => (
            <Link key={c.id} to="/companies/$id" params={{ id: c.id }}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-granate-tenue text-granate">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="text-[13px] text-ink-soft">
                        {c.industry ?? 'Sin rubro'} · {c._count?.costStructures ?? 0} estructuras
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.isActive ? 'ok' : 'idle'}>
                      {c.isActive ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                    <ChevronRight className="size-5 text-idle" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewCompanyForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCompany();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{
    name: string;
    industry?: string;
    cuit?: string;
  }>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await create.mutateAsync({
        name: values.name,
        industry: values.industry || undefined,
        cuit: values.cuit || undefined,
      });
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <Card className="mb-6 animate-rise">
      <CardBody>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
          <Input label="Nombre" {...register('name', { required: true })} />
          <Input label="Rubro" placeholder="Manufactura…" {...register('industry')} />
          <Input label="CUIT" placeholder="20-12345678-6" {...register('cuit')} />
          {error && (
            <div className="sm:col-span-3 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" size="sm" loading={formState.isSubmitting}>
              Guardar
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
