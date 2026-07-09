import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateCompany } from '../company-hooks';
import { apiErrorMessage } from '@/lib/api';

interface EditCompanyModalProps {
  company: { id: string; name: string; industry: string | null; cuit?: string | null };
  onClose: () => void;
}

export function EditCompanyModal({ company, onClose }: EditCompanyModalProps) {
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
