import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import { apiErrorMessage } from '@/lib/api';

interface NewStructureFormProps {
  companyId: string;
  onDone: () => void;
}

export function NewStructureForm({ companyId, onDone }: NewStructureFormProps) {
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
