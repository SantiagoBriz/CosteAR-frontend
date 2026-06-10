import { useState, useRef, useEffect, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Paperclip, X, Building2, CheckCircle2,
  FileText, Image, ChevronDown, Plus, AlertTriangle, Bot,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

// ── AI Analysis type (espeja DocumentAnalysis del backend) ───────────────────

interface DocumentAnalysis {
  documentType: string;
  quality: 'legible' | 'parcial' | 'ilegible';
  qualityNote?: string;
  costSection: 'MATERIA_PRIMA' | 'MANO_DE_OBRA' | 'COSTOS_INDIRECTOS' | 'VENTAS' | 'DESCONOCIDO';
  message: string;
  extractedData: {
    date?: string | null;
    supplier?: string | null;
    invoiceNumber?: string | null;
    totalAmount?: number | null;
    taxAmount?: number | null;
    netAmount?: number | null;
    currency?: string | null;
    items?: { description: string; quantity?: number | null; unitCost?: number | null; total?: number | null }[];
    department?: string | null;
    hoursWorked?: number | null;
    employeeCount?: number | null;
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  connectionId: string;
  connection: { id: string; company: { id: string; name: string; industry: string | null } };
}

interface Submission {
  id: string;
  rawContent: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  reviewNote: string | null;
  createdAt: string;
  fileName: string | null;
  fileMimeType: string | null;
  connectionId: string;
  connection: { company: { name: string } };
}

interface ChatMessage {
  id: string;
  role: 'operator' | 'system';
  text: string;
  fileName?: string;
  fileMimeType?: string;
  status?: Submission['status'];
  reviewNote?: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING:   { label: 'Pendiente de revisión', color: 'text-yellow-600 bg-yellow-50' },
  APPROVED:  { label: 'Aprobado ✓',            color: 'text-green-700 bg-green-50' },
  REJECTED:  { label: 'Rechazado',              color: 'text-red-600 bg-red-50' },
  CORRECTED: { label: 'Corregido',              color: 'text-blue-700 bg-blue-50' },
} as const;

const MAX_FILE_BYTES = 4.5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string).split(',')[1]) ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function submissionToMessage(s: Submission): ChatMessage {
  return {
    id: s.id,
    role: 'operator',
    text: s.rawContent,
    fileName: s.fileName ?? undefined,
    fileMimeType: s.fileMimeType ?? undefined,
    status: s.status,
    reviewNote: s.reviewNote ?? undefined,
    createdAt: s.createdAt,
  };
}

function parseAIFromNote(reviewNote?: string | null): DocumentAnalysis | null {
  if (!reviewNote) return null;
  try {
    const parsed: DocumentAnalysis = typeof reviewNote === 'string' ? JSON.parse(reviewNote) : reviewNote;
    if (parsed && parsed.documentType) return parsed;
    return null;
  } catch {
    return null;
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export function EmpresaPortalPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Empresa activa
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);

  // Chat
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Código de invitación
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['my-companies'],
    queryFn: async () => {
      const res = await api.get<{ data: Company[] }>('/empresa-portal/my-companies');
      return res.data.data;
    },
  });

  const { data: submissions = [] } = useQuery<Submission[]>({
    queryKey: ['my-submissions', activeConnectionId],
    queryFn: async () => {
      const params = activeConnectionId ? `?connectionId=${activeConnectionId}` : '';
      const res = await api.get<{ data: Submission[] }>(`/empresa-portal/my-submissions${params}`);
      return res.data.data;
    },
    refetchInterval: 15_000,
  });

  // Elegir primera empresa automáticamente
  useEffect(() => {
    if (companies.length === 1 && !activeConnectionId) {
      setActiveConnectionId(companies[0]!.connectionId);
    }
    if (companies.length > 1 && !activeConnectionId) {
      setShowCompanyPicker(true);
    }
  }, [companies, activeConnectionId]);

  // Scroll al fondo cuando llegan nuevos mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [submissions.length]);

  const activeCompany = companies.find((c) => c.connectionId === activeConnectionId);

  // ── Accept invite ──────────────────────────────────────────────────────────

  const acceptInvite = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post<{ data: { companyName: string } }>('/empresa-portal/accept-invite', { code });
      return res.data.data;
    },
    onSuccess: (data) => {
      setInviteSuccess(`¡Listo! Ahora sos operador de ${data.companyName}.`);
      setInviteCode('');
      setInviteError(null);
      qc.invalidateQueries({ queryKey: ['my-companies'] });
    },
    onError: (e) => setInviteError(apiErrorMessage(e)),
  });

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if ((!text.trim() && !file) || sending) return;
    if (!activeConnectionId && companies.length > 1) {
      setSendError('Seleccioná la empresa a la que querés enviar el dato.');
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      let fileData: string | undefined;
      let fileMimeType: string | undefined;
      let fileName: string | undefined;
      let sourceType: 'TEXT' | 'PDF' | 'IMAGE' = 'TEXT';

      if (file) {
        fileData = await fileToBase64(file);
        fileMimeType = file.type;
        fileName = file.name;
        sourceType = file.type.startsWith('image/') ? 'IMAGE' : 'PDF';
      }

      await api.post('/empresa-portal/submit', {
        rawContent: text,
        sourceType,
        connectionId: activeConnectionId ?? undefined,
        fileName,
        fileData,
        fileMimeType,
      });

      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['my-submissions', activeConnectionId] });
    } catch (e) {
      setSendError(apiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mensajes del chat: historial de DB + respuestas AI locales intercaladas
  const messages: ChatMessage[] = [...submissions].reverse().map(submissionToMessage);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#f6f5f3]">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-[#6B1D1D] text-white">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-white/20 text-sm font-bold">C</div>
          <span className="text-base font-bold tracking-tight">CosteAR</span>
        </div>

        {/* Mis empresas */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-white/40">Mis empresas</p>
          {companies.length === 0 && (
            <p className="px-2 text-[12px] text-white/50">Sin empresas aún</p>
          )}
          {companies.map((c) => (
            <button
              key={c.connectionId}
              type="button"
              onClick={() => setActiveConnectionId(c.connectionId)}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors',
                activeConnectionId === c.connectionId
                  ? 'bg-white/20 font-semibold text-white'
                  : 'text-white/70 hover:bg-white/10',
              )}
            >
              <Building2 className="mb-0.5 inline size-3.5 mr-1.5 opacity-70" />
              {c.connection.company.name}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-2">
          <button
            type="button"
            onClick={() => { setShowInviteModal(true); setInviteError(null); setInviteSuccess(null); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] text-white/70 hover:bg-white/10"
          >
            <Plus className="size-3.5" /> Unirme a empresa
          </button>
          <div className="px-2">
            <p className="text-[10px] text-white/40">Portal de empresa</p>
            <p className="truncate text-[12px] font-medium text-white/80">{user?.name}</p>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-5">
          <div>
            {activeCompany ? (
              <>
                <span className="text-[15px] font-semibold text-gray-900">
                  {activeCompany.connection.company.name}
                </span>
                {companies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowCompanyPicker(true)}
                    className="ml-2 text-[12px] text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown className="inline size-3.5" /> cambiar
                  </button>
                )}
              </>
            ) : (
              <span className="text-[14px] text-gray-400">Seleccioná una empresa</span>
            )}
          </div>
          <p className="text-[12px] text-gray-400">Los mensajes van directo a tu costista</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">
                  {activeConnectionId
                    ? 'No hay envíos todavía. Mandá tu primer dato.'
                    : 'Seleccioná una empresa desde el menú lateral.'}
                </p>
                <p className="mt-1 text-[12px] text-gray-400">
                  Podés enviar texto, fotos de facturas o PDFs.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const ai = parseAIFromNote(msg.reviewNote);
            return (
              <Fragment key={msg.id}>
                <ChatBubble message={msg} />
                {ai && <AIAnalysisBubble analysis={ai} />}
              </Fragment>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {sendError && (
          <div className="mx-5 mb-2 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600">
            {sendError}
            <button type="button" onClick={() => setSendError(null)} className="ml-2 text-red-400 hover:text-red-600"><X className="inline size-3.5" /></button>
          </div>
        )}

        {/* File preview */}
        {file && (
          <div className="mx-5 mb-1 flex items-center gap-2 rounded-lg border border-[#6B1D1D]/20 bg-[#6B1D1D]/5 px-3 py-2">
            {file.type.startsWith('image/') ? (
              <img src={URL.createObjectURL(file)} alt="preview" className="size-10 rounded object-cover" />
            ) : (
              <FileText className="size-5 text-[#6B1D1D]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-gray-700">{file.name}</p>
              <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500">
              <X className="size-4" />
            </button>
          </div>
        )}
        {fileError && <p className="mx-5 mb-1 text-[12px] text-red-500">{fileError}</p>}

        {/* Composer */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#6B1D1D]/40">
            {/* Attach */}
            <label className="shrink-0 cursor-pointer text-gray-400 hover:text-[#6B1D1D] mb-1">
              <Paperclip className="size-5" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-32 min-h-[36px]"
              placeholder={
                activeConnectionId
                  ? 'Escribí un dato, adjuntá una foto de factura o un PDF… (Enter para enviar)'
                  : 'Seleccioná una empresa primero'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConnectionId}
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />

            {/* Send */}
            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && !file) || sending || !activeConnectionId}
              className="mb-0.5 flex shrink-0 size-8 items-center justify-center rounded-lg bg-[#6B1D1D] text-white transition-opacity disabled:opacity-40"
            >
              {sending
                ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Send className="size-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-gray-400">
            Shift+Enter para salto de línea · máx. 4.5 MB por archivo
          </p>
        </div>
      </main>

      {/* Modal: aceptar código de invitación */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Unirme a una empresa</h2>
              <button type="button" onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5" /></button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-4">
                <CheckCircle2 className="mx-auto mb-2 size-10 text-green-500" />
                <p className="text-sm font-medium text-gray-800">{inviteSuccess}</p>
                <button type="button" onClick={() => setShowInviteModal(false)} className="mt-4 text-sm text-[#6B1D1D] hover:underline">Cerrar</button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-[13px] text-gray-500">
                  Ingresá el código que te envió el costista por email para unirte a la empresa.
                </p>
                <input
                  type="text"
                  placeholder="Ej: THIBAUT-X7K2"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-lg tracking-widest text-gray-900 placeholder:font-sans placeholder:text-[13px] placeholder:tracking-normal focus:border-[#6B1D1D] focus:outline-none"
                />
                {inviteError && <p className="mt-2 text-[12px] text-red-600">{inviteError}</p>}
                <button
                  type="button"
                  onClick={() => acceptInvite.mutate(inviteCode.trim())}
                  disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                  className="mt-4 w-full rounded-lg bg-[#6B1D1D] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {acceptInvite.isPending ? 'Verificando…' : 'Aceptar invitación'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: elegir empresa (multi-empresa) */}
      {showCompanyPicker && companies.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">¿Qué empresa querés ver?</h2>
            <div className="space-y-2">
              {companies.map((c) => (
                <button
                  key={c.connectionId}
                  type="button"
                  onClick={() => { setActiveConnectionId(c.connectionId); setShowCompanyPicker(false); }}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-[#6B1D1D]/40 hover:bg-[#6B1D1D]/5"
                >
                  <Building2 className="size-5 text-[#6B1D1D]" />
                  <div>
                    <p className="text-[14px] font-medium text-gray-800">{c.connection.company.name}</p>
                    {c.connection.company.industry && (
                      <p className="text-[12px] text-gray-400">{c.connection.company.industry}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message: msg }: { message: ChatMessage }) {
  const st = msg.status ? STATUS_CONFIG[msg.status] : null;
  const isImage = msg.fileMimeType?.startsWith('image/');
  const isPdf = msg.fileMimeType === 'application/pdf';

  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] space-y-1">
        <div className="rounded-2xl rounded-tr-sm bg-[#6B1D1D] px-4 py-2.5 text-sm text-white">
          {/* Archivo adjunto */}
          {msg.fileName && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              {isImage ? <Image className="size-4 shrink-0" /> : <FileText className="size-4 shrink-0" />}
              <span className="truncate text-[12px] font-medium">{msg.fileName}</span>
              {isPdf && <span className="shrink-0 text-[10px] bg-white/20 rounded px-1.5 py-0.5">PDF</span>}
            </div>
          )}
          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
        </div>

        {/* Estado */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] text-gray-400">{formatDate(msg.createdAt)}</span>
          {st && (
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', st.color)}>
              {st.label}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

// ── AI Analysis Bubble ────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA:     'Materia Prima',
  MANO_DE_OBRA:      'Mano de Obra',
  COSTOS_INDIRECTOS: 'Costos Indirectos',
  VENTAS:            'Ventas',
  DESCONOCIDO:       'Sin clasificar',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  factura_compra:     'Factura de compra',
  factura_venta:      'Factura de venta',
  remito:             'Remito',
  liquidacion_sueldos:'Liquidación de sueldos',
  planilla_horas:     'Planilla de horas',
  nota_debito:        'Nota de débito',
  recibo:             'Recibo',
  otro:               'Otro documento',
};

function fmt(n?: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
}

function AIAnalysisBubble({ analysis: a }: { analysis: DocumentAnalysis }) {
  const qualityColor = {
    legible:  'text-green-700 bg-green-50 border-green-200',
    parcial:  'text-yellow-700 bg-yellow-50 border-yellow-200',
    ilegible: 'text-red-700 bg-red-50 border-red-200',
  }[a.quality];

  const qualityLabel = {
    legible:  '✓ Legible',
    parcial:  '⚠ Parcialmente legible',
    ilegible: '✕ Ilegible',
  }[a.quality];

  const d = a.extractedData;
  const hasData = d && (d.supplier || d.totalAmount != null || d.date || d.invoiceNumber || (d.items && d.items.length > 0) || d.hoursWorked != null);

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] w-full">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex size-5 items-center justify-center rounded-full bg-indigo-100">
            <Bot className="size-3 text-indigo-600" />
          </div>
          <span className="text-[11px] text-gray-400">Análisis automático</span>
        </div>

        <div className="rounded-2xl rounded-tl-none border border-indigo-100 bg-indigo-50 overflow-hidden">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2">
            <span className="rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              {DOC_TYPE_LABELS[a.documentType] ?? a.documentType}
            </span>
            <span className="rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              {SECTION_LABELS[a.costSection]}
            </span>
            <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', qualityColor)}>
              {qualityLabel}
            </span>
          </div>

          {/* Advertencia calidad */}
          {(a.quality === 'parcial' || a.quality === 'ilegible') && a.qualityNote && (
            <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-yellow-600" />
              <p className="text-[12px] text-yellow-800">{a.qualityNote}</p>
            </div>
          )}

          {/* Mensaje principal */}
          <p className="px-4 pb-3 text-[13px] leading-relaxed text-indigo-900">{a.message}</p>

          {/* Datos extraídos */}
          {hasData && (
            <div className="border-t border-indigo-100 bg-white/60 px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-2">Datos detectados</p>

              {d.supplier && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Proveedor</span>
                  <span className="font-medium text-gray-800">{d.supplier}</span>
                </div>
              )}
              {d.invoiceNumber && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Comprobante</span>
                  <span className="font-medium text-gray-800 font-mono">{d.invoiceNumber}</span>
                </div>
              )}
              {d.date && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-gray-800">{d.date}</span>
                </div>
              )}
              {d.netAmount != null && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Neto</span>
                  <span className="font-medium text-gray-800">{fmt(d.netAmount)}</span>
                </div>
              )}
              {d.taxAmount != null && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">IVA</span>
                  <span className="font-medium text-gray-800">{fmt(d.taxAmount)}</span>
                </div>
              )}
              {d.totalAmount != null && (
                <div className="flex justify-between text-[13px] border-t border-gray-100 pt-1.5 mt-1">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-gray-900">{fmt(d.totalAmount)} {d.currency ?? ''}</span>
                </div>
              )}
              {d.hoursWorked != null && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Horas trabajadas</span>
                  <span className="font-medium text-gray-800">{d.hoursWorked} hs</span>
                </div>
              )}
              {d.department && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Departamento</span>
                  <span className="font-medium text-gray-800">{d.department}</span>
                </div>
              )}

              {/* Items */}
              {d.items && d.items.length > 0 && (
                <div className="mt-2 rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wide">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Descripción</th>
                        <th className="px-3 py-1.5 text-right font-medium">Cant.</th>
                        <th className="px-3 py-1.5 text-right font-medium">P. unit.</th>
                        <th className="px-3 py-1.5 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {d.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-700">{item.description}</td>
                          <td className="px-3 py-1.5 text-right text-gray-600">{item.quantity ?? '—'}</td>
                          <td className="px-3 py-1.5 text-right text-gray-600">{fmt(item.unitCost) ?? '—'}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-gray-800">{fmt(item.total) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
