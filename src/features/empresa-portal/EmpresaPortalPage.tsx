import { useState, useRef, useEffect, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Paperclip, X, Building2, CheckCircle2,
  FileText, Image, ChevronDown, Plus, Bot,
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
  fileUrl: string | null;
  connectionId: string;
  connection: { company: { name: string } };
}

interface ChatMessage {
  id: string;
  role: 'operator' | 'system';
  text: string;
  fileName?: string;
  fileMimeType?: string;
  fileUrl?: string | null;
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
    fileUrl: s.fileUrl ?? undefined,
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

  // ── Pantalla de bienvenida cuando no hay empresas activas ────────────────────

  if (companies.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f6f5f3] px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-[#6B1D1D] text-sm font-bold text-white">C</div>
            <span className="text-lg font-bold tracking-tight text-gray-900">CosteAR</span>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#6B1D1D]/10">
              <svg className="size-6 text-[#6B1D1D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>

            <h1 className="mb-1 text-[18px] font-bold text-gray-900">Hola, {user?.name?.split(' ')[0] ?? 'operador'}</h1>
            <p className="mb-5 text-[13px] text-gray-500">
              Tu cuenta está activa pero todavía no estás vinculado a ninguna empresa.
              Ingresá el código que te envió tu costista para acceder.
            </p>

            {inviteSuccess ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-[13px] font-semibold text-emerald-800">✅ {inviteSuccess}</p>
                <p className="mt-1 text-[12px] text-emerald-600">Recargando tu acceso…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                    Código de invitación
                  </label>
                  <input
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') acceptInvite.mutate(inviteCode.trim()); }}
                    placeholder="Ej: METAL-A3F2B1"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 font-mono text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#6B1D1D] focus:bg-white transition-colors"
                  />
                  {inviteError && (
                    <p className="mt-1.5 text-[12px] font-medium text-red-600">{inviteError}</p>
                  )}
                </div>
                <button
                  onClick={() => acceptInvite.mutate(inviteCode.trim())}
                  disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                  className="w-full rounded-xl bg-[#6B1D1D] py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#5a1818] disabled:opacity-50"
                >
                  {acceptInvite.isPending ? 'Verificando…' : 'Acceder a la empresa'}
                </button>
                <p className="text-center text-[11px] text-gray-400">
                  No tenés código? Pedíselo al costista que te invitó.
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => { useAuthStore.getState().clear(); window.location.href = '/login'; }}
            className="mt-4 w-full text-center text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

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
                {ai && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-indigo-100 bg-indigo-50 px-4 py-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Bot className="size-3.5 shrink-0 text-indigo-400" />
                        <span className="text-[11px] text-indigo-400 font-medium uppercase tracking-wide">Análisis automático</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
                          {{ factura_compra: 'Factura de compra', factura_venta: 'Factura de venta', remito: 'Remito', liquidacion_sueldos: 'Liquidación de sueldos', planilla_horas: 'Planilla de horas', nota_debito: 'Nota de débito', recibo: 'Recibo', otro: 'Otro documento' }[ai.documentType] ?? ai.documentType}
                        </span>
                        <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', {
                          legible:  'border-green-200 bg-green-50 text-green-700',
                          parcial:  'border-yellow-200 bg-yellow-50 text-yellow-700',
                          ilegible: 'border-red-200 bg-red-50 text-red-700',
                        }[ai.quality])}>
                          {{ legible: '✓ Legible', parcial: '⚠ Parcialmente legible', ilegible: '✕ Difícil de leer' }[ai.quality]}
                        </span>
                      </div>
                      {ai.quality === 'ilegible' && (
                        <p className="text-[12px] text-red-700">
                          El documento no se pudo leer bien. Si podés, intentá sacar una foto más clara con buena luz.
                        </p>
                      )}
                      {ai.quality === 'parcial' && ai.qualityNote && (
                        <p className="text-[12px] text-yellow-700">{ai.qualityNote}</p>
                      )}
                      {ai.quality === 'legible' && (
                        <p className="text-[12px] text-indigo-700">Tu costista lo recibió y está pendiente de revisión.</p>
                      )}
                    </div>
                  </div>
                )}
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
        <div className="rounded-2xl rounded-tr-sm bg-[#6B1D1D] text-sm text-white overflow-hidden">
          {/* Imagen desde Cloudinary */}
          {isImage && msg.fileUrl && (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={msg.fileUrl}
                alt={msg.fileName ?? 'imagen'}
                className="w-full max-h-48 object-cover"
              />
            </a>
          )}
          <div className="px-4 py-2.5">
            {/* Archivo sin preview (PDF o imagen sin URL) */}
            {msg.fileName && !(isImage && msg.fileUrl) && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                {isImage ? <Image className="size-4 shrink-0" /> : <FileText className="size-4 shrink-0" />}
                <span className="truncate text-[12px] font-medium">{msg.fileName}</span>
                {isPdf && msg.fileUrl && (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] bg-white/20 rounded px-1.5 py-0.5 hover:bg-white/30">
                    Ver PDF
                  </a>
                )}
                {isPdf && !msg.fileUrl && <span className="shrink-0 text-[10px] bg-white/20 rounded px-1.5 py-0.5">PDF</span>}
              </div>
            )}
            {msg.text && !msg.fileName && <p className="whitespace-pre-wrap">{msg.text}</p>}
          </div>
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


