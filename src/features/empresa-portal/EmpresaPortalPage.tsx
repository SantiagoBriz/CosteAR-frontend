import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, Upload, FileText, Image, AlignLeft, Clock, Send, X, Paperclip } from 'lucide-react';
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
  fileName: string | null;
  fileMimeType: string | null;
}

const SOURCE_OPTIONS: { value: SourceType; label: string; icon: typeof AlignLeft; hint: string; accept: string }[] = [
  { value: 'TEXT',  label: 'Texto libre',    icon: AlignLeft,  hint: 'Describí el dato con tus palabras',        accept: '' },
  { value: 'PDF',   label: 'Factura / PDF',  icon: FileText,   hint: 'Subí un PDF o adjuntá el archivo',         accept: 'application/pdf,.pdf' },
  { value: 'IMAGE', label: 'Foto / Imagen',  icon: Image,      hint: 'Foto de factura, remito o precio de lista', accept: 'image/*' },
];

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendiente', className: 'bg-yellow-50 text-yellow-700' },
  APPROVED:  { label: 'Aprobado',  className: 'bg-green-50 text-green-700' },
  REJECTED:  { label: 'Rechazado', className: 'bg-red-50 text-red-600' },
  CORRECTED: { label: 'Corregido', className: 'bg-blue-50 text-blue-700' },
};

const MAX_FILE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string).split(',')[1]) ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EmpresaPortalPage() {
  const user = useAuthStore((s) => s.user);
  const [sourceType, setSourceType] = useState<SourceType>('TEXT');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: submissions = [], refetch } = useQuery({
    queryKey: ['empresa-portal', 'submissions'],
    queryFn: async () => {
      const res = await api.get<{ data: Submission[] }>('/empresa-portal/my-submissions');
      return res.data.data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      let fileData: string | undefined;
      let fileMimeType: string | undefined;
      let fileName: string | undefined;

      if (file) {
        fileData = await fileToBase64(file);
        fileMimeType = file.type;
        fileName = file.name;
      }

      await api.post('/empresa-portal/submit', {
        rawContent: content,
        sourceType,
        fileName,
        fileData,
        fileMimeType,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      setContent('');
      setFile(null);
      setSubmitError(null);
      refetch();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Error al enviar. Intentá de nuevo.';
      setSubmitError(msg);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!selected) { setFile(null); return; }
    if (selected.size > MAX_FILE_BYTES) {
      setFileError(`El archivo pesa ${(selected.size / 1024 / 1024).toFixed(1)} MB. El máximo es 4.5 MB.`);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSourceChange = (v: SourceType) => {
    setSourceType(v);
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = sourceType === 'TEXT'
    ? content.trim().length > 0
    : file !== null || content.trim().length > 0;

  const currentOption = SOURCE_OPTIONS.find((o) => o.value === sourceType)!;

  return (
    <div className="flex min-h-screen bg-[#f6f5f3]">
      {/* Sidebar */}
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
              <Button className="mt-5" variant="secondary" size="sm" onClick={() => setSubmitted(false)}>
                Enviar otro dato
              </Button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
              {/* Selector de tipo */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Tipo de dato
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SOURCE_OPTIONS.map(({ value, label, icon: Icon, hint }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleSourceChange(value)}
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

              {/* Zona de archivo (PDF / Imagen) */}
              {sourceType !== 'TEXT' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                    Archivo adjunto {sourceType === 'PDF' ? '(PDF)' : '(imagen)'}
                  </label>

                  {file ? (
                    /* Archivo seleccionado */
                    <div className="flex items-center gap-3 rounded-lg border border-[#6B1D1D]/30 bg-[#6B1D1D]/5 px-4 py-3">
                      <Paperclip className="size-4 shrink-0 text-[#6B1D1D]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
                        <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      {/* Preview rápido para imágenes */}
                      {file.type.startsWith('image/') && (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="size-12 rounded object-cover border border-gray-200"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    /* Zona de drop / clic */
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-8 text-center transition-colors hover:border-[#6B1D1D]/40 hover:bg-[#6B1D1D]/3">
                      <Upload className="size-7 text-gray-300" />
                      <span className="text-sm text-gray-500">
                        Hacé clic para seleccionar o arrastrá el archivo acá
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {sourceType === 'PDF' ? 'PDF' : 'JPG, PNG, WebP, HEIC'} · máx. 4.5 MB
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={currentOption.accept}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}

                  {fileError && (
                    <p className="mt-1 text-[12px] text-red-600">{fileError}</p>
                  )}
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                  {sourceType === 'TEXT' ? 'Descripción del dato' : 'Descripción del contenido (opcional si adjuntás archivo)'}
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#6B1D1D] focus:outline-none min-h-[100px] resize-none"
                  placeholder={
                    sourceType === 'TEXT'
                      ? 'Ej: La tarifa de electricidad subió a $0.22/kWh desde noviembre. Contrato con EDENOR.'
                      : 'Ej: Factura de proveedor Acería del Norte, octubre 2026. Precio de chapa $1.850/kg.'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={10000}
                />
                <p className="mt-1 text-[11px] text-gray-400 text-right">{content.length}/10000</p>
              </div>

              {submitError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600">{submitError}</p>
              )}

              <Button
                className="w-full bg-[#6B1D1D] hover:bg-[#5a1818] text-white"
                onClick={() => submit.mutate()}
                loading={submit.isPending}
                disabled={!canSubmit}
              >
                <Send className="size-4" />
                Enviar al costista
              </Button>
            </div>
          )}

          {/* Historial */}
          {submissions.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Mis envíos recientes</h2>
              <div className="space-y-2">
                {submissions.slice(0, 10).map((s) => {
                  const st = STATUS_STYLE[s.status] ?? STATUS_STYLE['PENDING']!;
                  const icon = s.sourceType === 'PDF' ? <FileText className="mt-0.5 size-4 shrink-0 text-gray-300" />
                    : s.sourceType === 'IMAGE' ? <Image className="mt-0.5 size-4 shrink-0 text-gray-300" />
                    : <Clock className="mt-0.5 size-4 shrink-0 text-gray-300" />;
                  return (
                    <div
                      key={s.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {icon}
                        <div className="min-w-0">
                          {s.fileName && (
                            <p className="text-[12px] font-medium text-[#6B1D1D] truncate">{s.fileName}</p>
                          )}
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
