import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Plus, Building2, ChevronRight, Trash2 } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCompanies, useCreateCompany, useDeleteCompany } from './company-hooks';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const [showForm, setShowForm] = useState(false);
  const deleteCompany = useDeleteCompany();

  const handleDelete = async (companyId: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${name}? Esta acción eliminará permanentemente la empresa, todas sus estructuras de costos, libro de costos, firmas y operadores vinculados.`)) {
      try {
        await deleteCompany.mutateAsync(companyId);
      } catch (e) {
        alert('Error al eliminar la empresa: ' + apiErrorMessage(e));
      }
    }
  };

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
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white border border-line text-granate shadow-sm">
              <Building2 className="size-6" />
            </div>
            <p className="text-sm text-ink-soft">Todavía no cargaste ningún cliente.</p>
            <Button onClick={() => setShowForm(true)} variant="secondary" size="sm">
              <Plus className="size-4" /> Agregar el primero
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-zinc-50/15 px-6 py-5">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">
              {companies.length} cliente{companies.length !== 1 ? 's' : ''} registrado{companies.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {companies.map((c) => (
              <li key={c.id}>
                <Link
                  to="/companies/$id"
                  params={{ id: c.id }}
                  className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/15"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate shadow-sm transition-transform duration-300 group-hover:scale-105">
                      <Building2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink transition-colors group-hover:text-granate">{c.name}</p>
                      <p className="mt-0.5 text-[12px] text-ink-soft">
                        {c.industry ?? 'Sin rubro'} · {c._count?.costStructures ?? 0} estructuras
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={c.isActive ? 'ok' : 'idle'}>
                      {c.isActive ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(c.id, c.name);
                      }}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Eliminar Cliente"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <ChevronRight className="size-5 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}

function NewCompanyForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCompany();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setValue, watch } = useForm<{
    name: string;
    industry?: string;
    cuit?: string;
    description?: string;
  }>();

  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const startSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta dictado por voz. Por favor usá Chrome, Edge o Safari.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'es-AR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsRecording(true);
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      const currentDesc = watch('description') || '';
      setValue('description', currentDesc ? `${currentDesc} ${text}` : text);
    };

    rec.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    rec.start();
    setRecognition(rec);
  };

  const stopSpeech = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsRecording(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await create.mutateAsync({
        name: values.name,
        industry: values.industry || undefined,
        cuit: values.cuit || undefined,
        description: values.description || undefined,
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
          
          <div className="sm:col-span-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                Descripción / Contexto del cliente
              </label>
              <button
                type="button"
                onClick={isRecording ? stopSpeech : startSpeech}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all",
                  isRecording 
                    ? "bg-red-50 text-red-600 border-red-200" 
                    : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                )}
              >
                {isRecording ? (
                  <>
                    <span className="inline-block size-1.5 rounded-full bg-red-600 mr-0.5 animate-ping" />
                    Detener dictado
                  </>
                ) : (
                  <>
                    <span className="text-[10px]">🎙️</span>
                    Dictar por voz
                  </>
                )}
              </button>
            </div>
            <textarea
              {...register('description')}
              placeholder="Ej: Fabrica muebles de madera. Costea por órdenes de producción. El principal insumo es madera de pino y la chapa MDF..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-granate focus:outline-none min-h-[80px]"
            />
          </div>

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
