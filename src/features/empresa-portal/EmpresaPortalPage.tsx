import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Upload, FileText, Image, AlignLeft, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

type SourceType = 'TEXT' | 'PDF' | 'IMAGE';

interface Submission {
  id: string;
  rawContent: string;
  sourceType: SourceType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const SOURCE_OPTIONS: { value: SourceType; label: string; icon: typeof AlignLeft; hint: string }[] = [
  { value: 'TEXT', label: 'Texto libre', icon: AlignLeft, hint: 'Describí el dato con tus palabras' },
  { value: 'PDF', label: 'Factura / PDF', icon: FileText, hint: 'Cargaste un documento, describilo' },
  { value: 'IMAGE', label: 'Foto / Imagen', icon: Image, hint: 'Tomaste una foto de un documento' },
];

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendiente', className: 'bg-yellow-50 text-yellow-700' },
  APPROVED:  { label: 'Aprobado',  className: 'bg-green-50 text-green-700' },
  REJECTED:  { label: 'Rechazado', className: 'bg-red-50 text-red-600' },
  CORRECTED: { label: 'Corregido', className: 'bg-blue-50 text-blue-700' },
};

export function EmpresaPortalPage() {
  const user = useAuthStore((s) => s.user);
  const [sourceType, setSourceType] = useState<SourceType>('TEXT');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: submissions = [], refetch } = useQuery({
    queryKey: ['empresa-portal', 'submissions'],
    queryFn: async () => {
      const res = await api.get<{ data: Submission[] }>('/empresa-portal/my-submissions');
      return res.data.data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      await api.post('/empresa-portal/submit', {
        rawContent: content,
        sourceType,
        fileName: fileName || undefined,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setContent('');
      setFileName('');
      refetch();
    },
  });

  const handleNewDoc = () => {
    setSubmitted(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f6f5f3]">
      {/* Sidebar mínimo */}
      <aside className="fixed inset-y-0 left-0 flex w-52 flex-col bg-[#6B1D1D] text-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="flex size-7 items-center justify-center rounded-md bg-white/20 text-sm font-bold">C</div>
          <span className="text-lg font-bold tracking-tight">CosteAR</span>
        </div>
        <div className="flex-1 px-3 py-4">
          <div className="rounded-md bg-white/15 px-3 py-2.5 text-sm font-medium text-white">
            <Upload className="mb-1 size-4" />
            Cargar datos
          </div>
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="text-[11px] text-white/50">Portal de empresa</p>
          <p className="text-[12px] font-medium text-white/80 truncate">{user?.name}</p>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="ml-52 flex-1 px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
            Enviar información al costista
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Cargá datos de tu empresa para que tu asesor los revise y aplique.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-xl border border-green-100 bg-green-50 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 size-10 text-green-600" />
              <p className="font-semibold text-gray-900">Dato enviado correctamente</p>
              <p className="mt-1 text-sm text-gray-500">
                Tu costista lo recibirá y lo revisará a la brevedad.
              </p>
              <Button className="mt-5" variant="secondary" size="sm" onClick={handleNewDoc}>
                Enviar otro dato
              </Button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              {/* Selector de tipo */}
              <div className="mb-5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Tipo de dato
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SOURCE_OPTIONS.map(({ value, label, icon: Icon, hint }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSourceType(value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-center text-[13px] font-medium transition-all',
                        sourceType === value
                          ? 'border-[#6B1D1D] bg-[#6B1D1D]/5 text-[#6B1D1D]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      <Icon className="size-5" />
                      {label}
                      {sourceType === value && (
                        <span className="text-[11px] font-normal text-[#6B1D1D]/70">{hint}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre de archivo si aplica */}
              {sourceType !== 'TEXT' && (
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                    Nombre del archivo (opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6B1D1D] focus:outline-none"
                    placeholder="factura-proveedor-oct.pdf"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>
              )}

              {/* Descripción del dato */}
              <div className="mb-5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                  {sourceType === 'TEXT' ? 'Descripción del dato' : 'Descripción del contenido'}
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6B1D1D] focus:outline-none min-h-[120px] resize-none"
                  placeholder={
                    sourceType === 'TEXT'
                      ? 'Ej: La tarifa de electricidad subió a $0.22/kWh desde noviembre. Contrato con EDENOR.'
                      : 'Describí qué contiene el documento y qué dato relevante tiene…'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-gray-400 text-right">{content.length}/10000</p>
              </div>

              <Button
                className="w-full bg-[#6B1D1D] hover:bg-[#5a1818] text-white"
                onClick={() => submit.mutate()}
                loading={submit.isPending}
                disabled={!content.trim()}
              >
                <Send className="size-4" />
                Enviar al costista
              </Button>

              {submit.isError && (
                <p className="mt-2 text-[12px] text-red-600 text-center">
                  Error al enviar. Intentá de nuevo.
                </p>
              )}
            </div>
          )}

          {/* Historial de envíos */}
          {submissions.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Mis envíos recientes</h2>
              <div className="space-y-2">
                {submissions.slice(0, 10).map((s) => {
                  const st = STATUS_STYLE[s.status] ?? STATUS_STYLE['PENDING']!;
                  return (
                    <div
                      key={s.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Clock className="mt-0.5 size-4 shrink-0 text-gray-300" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-gray-800 truncate max-w-sm">{s.rawContent}</p>
                          {s.reviewNote && (
                            <p className="mt-0.5 text-[12px] text-gray-400 italic">"{s.reviewNote}"</p>
                          )}
                          <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(s.createdAt)}</p>
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium', st.className)}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
