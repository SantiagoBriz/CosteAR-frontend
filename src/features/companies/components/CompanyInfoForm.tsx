import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PERIODICITY_OPTIONS, type Periodicity } from '@/lib/types';
import { apiErrorMessage } from '@/lib/api';
import { useUpdateCompany } from '../company-hooks';
import toast from 'react-hot-toast';

export function CompanyInfoForm({
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
      toast.error('Error al actualizar los datos: ' + apiErrorMessage(e));
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
