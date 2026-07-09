import { useState, useRef, useEffect, Fragment } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Paperclip, X, Building2, CheckCircle2,
  FileText, Image, ChevronDown, ChevronRight, Package, Plus, LogOut, ArrowLeft, Menu,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/auth-hooks';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CosteARLogo } from '@/components/layout/CosteARLogo';



// ── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  connectionId: string;
  connection: {
    id: string;
    company: { id: string; name: string; industry: string | null };
    costist?: { id: string; name: string } | null;
  };
}

interface Submission {
  id: string;
  rawContent: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  reviewNote: string | null;
  costistaNote: string | null;
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
  costistaNote?: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING:   { label: 'Pendiente de revisión', color: 'text-warn bg-warn/10 border-warn/20' },
  APPROVED:  { label: 'Aprobado ✓',            color: 'text-ok bg-ok/10 border-ok/20' },
  REJECTED:  { label: 'Rechazado',              color: 'text-danger bg-danger/10 border-danger/20' },
  CORRECTED: { label: 'Corregido',              color: 'text-granate bg-granate-tenue border-granate/20' },
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
    costistaNote: s.costistaNote ?? undefined,
    createdAt: s.createdAt,
  };
}



// ── Main component ───────────────────────────────────────────────────────────

export function EmpresaPortalPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const qc = useQueryClient();

  // Empresa activa
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  // Drawer del sidebar en mobile (el layout de este portal es standalone, sin AppShell/tab bar).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Empresa desplegada en el sidebar y producto/estructura activo (aislamiento).
  const [expandedConnectionId, setExpandedConnectionId] = useState<string | null>(null);
  const [activeStructureId, setActiveStructureId] = useState<string | null>(null);
  const [activeStructureName, setActiveStructureName] = useState<string | null>(null);

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
    queryKey: ['my-submissions', activeConnectionId, activeStructureId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (activeConnectionId) qs.set('connectionId', activeConnectionId);
      if (activeStructureId) qs.set('costStructureId', activeStructureId);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await api.get<{ data: Submission[] }>(`/empresa-portal/my-submissions${suffix}`);
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
        costStructureId: activeStructureId ?? undefined,
        fileName,
        fileData,
        fileMimeType,
      });

      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['my-submissions', activeConnectionId, activeStructureId] });
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
      <div className="flex h-screen flex-col items-center justify-center bg-surface-alt px-4">
        <div className="w-full max-w-sm">
          {/* Volver atrás */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-1 text-[13px] text-ink-soft transition-colors hover:text-granate"
          >
            <ArrowLeft className="size-4" /> Volver
          </button>

          {/* Logo */}
          <div className="mb-8 flex items-center gap-2.5">
            <CosteARLogo className="h-8 w-auto text-granate" />
            <span className="text-lg font-extrabold tracking-tight text-granate">CosteAR</span>
          </div>

          {/* Card */}
          <Card className="p-6">
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-granate-tenue">
              <svg className="size-6 text-granate" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>

            <h1 className="mb-1 text-[19px] font-extrabold tracking-tight text-ink">Hola, {user?.name?.split(' ')[0] ?? 'operador'}</h1>
            <p className="mb-5 text-[13px] text-ink-soft">
              Tu cuenta está activa pero todavía no estás vinculado a ninguna empresa.
              Ingresá el código que te envió tu costista para acceder.
            </p>

            {inviteSuccess ? (
              <div className="rounded-2xl border border-ok/20 bg-ok/10 px-4 py-3">
                <p className="text-[13px] font-semibold text-ok">✅ {inviteSuccess}</p>
                <p className="mt-1 text-[12px] text-ok/80">Recargando tu acceso…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Código de invitación"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') acceptInvite.mutate(inviteCode.trim()); }}
                  placeholder="Ej: METAL-A3F2B1"
                  error={inviteError ?? undefined}
                  className="font-mono-jb tracking-wide"
                />
                <Button
                  onClick={() => acceptInvite.mutate(inviteCode.trim())}
                  disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                  loading={acceptInvite.isPending}
                  className="w-full"
                >
                  {acceptInvite.isPending ? 'Verificando…' : 'Acceder a la empresa'}
                </Button>
                <p className="text-center text-[11px] text-ink-soft/70">
                  No tenés código? Pedíselo al costista que te invitó.
                </p>
              </div>
            )}
          </Card>

          {/* Logout */}
          <button
            onClick={() => { useAuthStore.getState().clear(); window.location.href = '/login'; }}
            className="mt-4 w-full text-center text-[12px] text-ink-soft/70 hover:text-granate transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-surface-alt">
      {/* Overlay del drawer — solo mobile */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar — drawer deslizable en mobile, columna fija desde sm hacia arriba */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-granate-deep border-r border-white/10 text-white transition-transform duration-200 ease-out',
          'sm:static sm:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-4">
          <CosteARLogo className="h-6 w-auto text-white" animate={false} />
          <span className="flex-1 text-base font-extrabold tracking-tight text-white">CosteAR</span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white sm:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mis empresas */}
        <div className="flex-1 overflow-y-auto p-2.5">
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Mis empresas</p>
          {companies.length === 0 && (
            <p className="px-2 text-[12px] text-white/40">Sin empresas aún</p>
          )}
          {companies.map((c) => {
            const isExpanded = expandedConnectionId === c.connectionId;
            const isActiveCompany = activeConnectionId === c.connectionId;
            return (
              <div key={c.connectionId} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveConnectionId(c.connectionId);
                    setExpandedConnectionId(isExpanded ? null : c.connectionId);
                  }}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors',
                    isActiveCompany
                      ? 'bg-action font-semibold text-white shadow-sm shadow-action/30'
                      : 'text-white/60 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {isExpanded ? <ChevronDown className="size-3.5 shrink-0 opacity-70" /> : <ChevronRight className="size-3.5 shrink-0 opacity-70" />}
                  <Building2 className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{c.connection.company.name}</span>
                </button>

                {isExpanded && (
                  <CompanyStructures
                    connectionId={c.connectionId}
                    activeStructureId={activeStructureId}
                    onSelectStructure={(id, name) => {
                      setActiveConnectionId(c.connectionId);
                      setActiveStructureId(id);
                      setActiveStructureName(name);
                    }}
                    onClearStructure={() => {
                      setActiveStructureId(null);
                      setActiveStructureName(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {user?.role === 'COSTISTA' && (
            <Link
              to="/dashboard"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-action-soft hover:bg-white/5 transition-colors font-semibold"
            >
              Volver a Panel Costista
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setShowInviteModal(true); setInviteError(null); setInviteSuccess(null); }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Plus className="size-3.5" /> Unirme a empresa
          </button>
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSettled: () => { window.location.href = '/login'; } })}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="size-3.5" /> Cerrar sesión
          </button>
          <div className="px-2 pt-1">
            <p className="text-[10px] uppercase tracking-wide text-white/40">Portal de empresa</p>
            <p className="truncate text-[12px] font-semibold text-white/90">{user?.name}</p>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-3 sm:px-5">
          {/* Abrir drawer — solo mobile */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 sm:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            {activeCompany ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-gray-900">
                    {activeCompany.connection.company.name}
                  </span>
                  {companies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowCompanyPicker(true)}
                      className="text-[12px] text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown className="inline size-3.5" /> cambiar
                    </button>
                  )}
                </div>
                {activeStructureName ? (
                  <p className="flex items-center gap-1 text-[12px] text-granate">
                    <Package className="size-3" /> Cargando datos para: <span className="font-semibold">{activeStructureName}</span>
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-400">Todos los productos · elegí uno en el menú para separar sus datos</p>
                )}
              </>
            ) : (
              <span className="text-[14px] text-gray-400">Seleccioná una empresa</span>
            )}
          </div>
          <p className="hidden shrink-0 text-[13px] text-gray-500 sm:block">
            Los mensajes van directo a{' '}
            <span className="font-bold text-gray-900">
              {activeCompany?.connection.costist?.name ?? 'tu costista'}
            </span>
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 sm:px-6">
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
            return (
              <Fragment key={msg.id}>
                <ChatBubble message={msg} />
              </Fragment>
            );
          })}

          {/* Burbuja de envío en curso */}
          {sending && (
            <div className="flex justify-end">
              <div className="flex items-center gap-2 rounded-2xl rounded-tr-sm bg-[#6B1D1D]/80 px-4 py-2.5 text-sm text-white">
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Enviando…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {sendError && (
          <div className="mx-3 mb-2 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600 sm:mx-5">
            {sendError}
            <button type="button" onClick={() => setSendError(null)} className="ml-2 text-red-400 hover:text-red-600"><X className="inline size-3.5" /></button>
          </div>
        )}

        {/* File preview */}
        {file && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-lg border border-[#6B1D1D]/20 bg-[#6B1D1D]/5 px-3 py-2 sm:mx-5">
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
        {fileError && <p className="mx-3 mb-1 text-[12px] text-red-500 sm:mx-5">{fileError}</p>}

        {/* Composer */}
        <div className="border-t border-gray-200 bg-white px-3 py-3 sm:px-4">
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
      <div className="max-w-[88%] space-y-1 sm:max-w-[75%]">
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

        {/* Nota del Costista (Rechazo / Aprobación / Corrección) */}
        {msg.costistaNote && (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm leading-relaxed mt-1 text-left">
            <p className="font-semibold text-gray-800 mb-0.5">Nota de revisión:</p>
            <p className="italic">"{msg.costistaNote}"</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Desplegable de productos/estructuras de una empresa ───────────────────────

interface PortalStructure {
  id: string;
  productName: string;
  period: string;
  status: string;
}

function CompanyStructures({
  connectionId,
  activeStructureId,
  onSelectStructure,
  onClearStructure,
}: {
  connectionId: string;
  activeStructureId: string | null;
  onSelectStructure: (id: string, name: string) => void;
  onClearStructure: () => void;
}) {
  const { data: structures = [], isLoading } = useQuery<PortalStructure[]>({
    queryKey: ['portal-structures', connectionId],
    queryFn: async () => {
      const res = await api.get<{ data: PortalStructure[] }>(
        `/empresa-portal/connections/${connectionId}/structures`,
      );
      return res.data.data;
    },
  });

  return (
    <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-zinc-800 py-1 pl-2">
      {isLoading && <p className="px-2 py-1 text-[11px] text-zinc-500">Cargando productos…</p>}
      {!isLoading && structures.length === 0 && (
        <p className="px-2 py-1 text-[11px] text-zinc-500">Sin productos cargados</p>
      )}
      {structures.length > 0 && (
        <button
          type="button"
          onClick={onClearStructure}
          className={cn(
            'flex w-full items-center rounded px-2 py-1 text-left text-[12px] transition-colors',
            activeStructureId === null ? 'font-medium text-zinc-200' : 'text-zinc-500 hover:text-zinc-200',
          )}
        >
          Todos los productos
        </button>
      )}
      {structures.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelectStructure(s.id, s.productName)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] transition-colors',
            activeStructureId === s.id
              ? 'bg-granate/40 font-medium text-white'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
          )}
          title={`${s.productName} · ${s.period}`}
        >
          <Package className="size-3 shrink-0 opacity-70" />
          <span className="truncate">{s.productName}</span>
          <span className="ml-auto shrink-0 text-[10px] text-zinc-500">{s.period}</span>
        </button>
      ))}
    </div>
  );
}


