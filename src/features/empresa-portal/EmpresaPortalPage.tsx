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
    <div className="flex h-screen bg-surface-alt font-sans">
      {/* Overlay del drawer — solo mobile */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 sm:hidden"
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
          <span className="flex-1 text-base font-extrabold tracking-tight text-white font-outfit">CosteAR</span>
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
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Mis empresas</p>
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
          <div className="px-2 pt-1 border-t border-white/5 mt-2">
            <p className="text-[10px] uppercase tracking-wide text-white/40">Portal de empresa</p>
            <p className="truncate text-[12px] font-semibold text-white/90">{user?.name}</p>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col min-w-0 bg-surface-alt">
        {/* Header */}
        <div className="flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6 shadow-sm">
          {/* Abrir drawer — solo mobile */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-alt sm:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            {activeCompany ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-ink">
                    {activeCompany.connection.company.name}
                  </span>
                  {companies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowCompanyPicker(true)}
                      className="text-xs text-action-soft hover:text-action transition-colors"
                    >
                      <ChevronDown className="inline size-3.5" /> cambiar
                    </button>
                  )}
                </div>
                {activeStructureName ? (
                  <p className="flex items-center gap-1 text-xs text-granate font-medium">
                    <Package className="size-3" /> Cargando datos para: <span className="font-semibold">{activeStructureName}</span>
                  </p>
                ) : (
                  <p className="text-xs text-ink-soft">Todos los productos · elegí uno en el menú para separar sus datos</p>
                )}
              </>
            ) : (
              <span className="text-sm text-ink-soft">Seleccioná una empresa</span>
            )}
          </div>
          <p className="hidden shrink-0 text-xs text-ink-soft sm:block">
            Los mensajes van directo a{' '}
            <span className="font-bold text-ink">
              {activeCompany?.connection.costist?.name ?? 'tu costista'}
            </span>
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 sm:px-8">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-sm">
                <p className="text-sm font-semibold text-ink-soft">
                  {activeConnectionId
                    ? 'No hay envíos todavía. Mandá tu primer dato.'
                    : 'Seleccioná una empresa desde el menú lateral.'}
                </p>
                <p className="mt-1.5 text-xs text-ink-soft/70">
                  Podés enviar texto, fotos de facturas o archivos PDF para que tu costista los procese.
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
            <div className="flex justify-end animate-pulse">
              <div className="flex items-center gap-2 rounded-2xl rounded-tr-none bg-granate/80 px-4 py-2.5 text-sm text-white shadow-sm">
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Enviando…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {sendError && (
          <div className="mx-4 mb-2 rounded-xl bg-danger/10 px-4 py-2.5 text-xs text-danger sm:mx-8 flex items-center justify-between">
            <span className="truncate">{sendError}</span>
            <button type="button" onClick={() => setSendError(null)} className="text-danger hover:text-danger/80"><X className="size-4" /></button>
          </div>
        )}

        {/* File preview */}
        {file && (
          <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-granate/20 bg-granate-tenue px-4 py-2.5 sm:mx-8">
            {file.type.startsWith('image/') ? (
              <img src={URL.createObjectURL(file)} alt="preview" className="size-10 rounded-lg object-cover border border-line" />
            ) : (
              <FileText className="size-6 text-granate" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{file.name}</p>
              <p className="text-[10px] text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-ink-soft hover:text-danger transition-colors">
              <X className="size-4" />
            </button>
          </div>
        )}
        {fileError && <p className="mx-4 mb-2 text-xs text-danger sm:mx-8">{fileError}</p>}

        {/* Composer */}
        <div className="border-t border-line bg-surface px-4 py-4 sm:px-6 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-end gap-3 rounded-2xl border border-line bg-surface-alt px-4 py-3 focus-within:border-action/40 focus-within:ring-1 focus-within:ring-action/40 transition-all">
            {/* Attach */}
            <label className="shrink-0 cursor-pointer text-ink-soft hover:text-action transition-colors mb-1">
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
              className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-soft/45 focus:outline-none max-h-32 min-h-[38px]"
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
              className="mb-0.5 flex shrink-0 size-8 items-center justify-center rounded-xl bg-action text-white hover:bg-action-soft hover:shadow-md transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"
            >
              {sending
                ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Send className="size-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-ink-soft/60">
            Shift+Enter para salto de línea · máx. 4.5 MB por archivo
          </p>
        </div>
      </main>

      {/* Modal: aceptar código de invitación */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl border border-line">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold tracking-tight text-ink">Unirme a una empresa</h2>
              <button type="button" onClick={() => setShowInviteModal(false)} className="text-ink-soft hover:text-ink"><X className="size-5" /></button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-4">
                <CheckCircle2 className="mx-auto mb-2 size-10 text-ok animate-bounce" />
                <p className="text-sm font-semibold text-ink">{inviteSuccess}</p>
                <button type="button" onClick={() => setShowInviteModal(false)} className="mt-4 text-xs font-bold uppercase tracking-wider text-action hover:text-action-soft">Cerrar</button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-ink-soft">
                  Ingresá el código que te envió el costista por email para vincular tu usuario a la empresa.
                </p>
                <input
                  type="text"
                  placeholder="Ej: THIBAUT-X7K2"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-line px-4 py-3 font-mono text-lg tracking-widest text-ink placeholder:font-sans placeholder:text-xs placeholder:tracking-normal focus:border-action focus:ring-1 focus:ring-action focus:outline-none"
                />
                {inviteError && <p className="mt-2 text-xs text-danger">{inviteError}</p>}
                <button
                  type="button"
                  onClick={() => acceptInvite.mutate(inviteCode.trim())}
                  disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                  className="mt-4 w-full rounded-xl bg-action py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-action-soft disabled:opacity-40 transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl border border-line">
            <h2 className="mb-4 text-base font-extrabold tracking-tight text-ink">¿Qué empresa querés ver?</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {companies.map((c) => (
                <button
                  key={c.connectionId}
                  type="button"
                  onClick={() => { setActiveConnectionId(c.connectionId); setShowCompanyPicker(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-action/40 hover:bg-granate-tenue transition-all"
                >
                  <Building2 className="size-5 text-action" />
                  <div>
                    <p className="text-sm font-bold text-ink">{c.connection.company.name}</p>
                    {c.connection.company.industry && (
                      <p className="text-xs text-ink-soft">{c.connection.company.industry}</p>
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
      <div className="max-w-[88%] space-y-1.5 sm:max-w-[70%]">
        <div className="rounded-2xl rounded-tr-none bg-granate text-sm text-white overflow-hidden shadow-sm shadow-granate/10 hover:shadow-md transition-shadow">
          {/* Imagen desde Cloudinary */}
          {isImage && msg.fileUrl && (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={msg.fileUrl}
                alt={msg.fileName ?? 'imagen'}
                className="w-full max-h-56 object-cover border-b border-white/10"
              />
            </a>
          )}
          <div className="px-4 py-3">
            {/* Archivo sin preview (PDF o imagen sin URL) */}
            {msg.fileName && !(isImage && msg.fileUrl) && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/10 px-3.5 py-2.5">
                {isImage ? <Image className="size-5 shrink-0" /> : <FileText className="size-5 shrink-0" />}
                <span className="truncate text-xs font-semibold">{msg.fileName}</span>
                {isPdf && msg.fileUrl && (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider bg-white/20 rounded-lg px-2.5 py-1 hover:bg-white/30 transition-colors">
                    Ver PDF
                  </a>
                )}
                {isPdf && !msg.fileUrl && <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider bg-white/20 rounded-lg px-2.5 py-1">PDF</span>}
              </div>
            )}
            {msg.text && !msg.fileName && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-ink-soft/70 font-mono">{formatDate(msg.createdAt)}</span>
          {st && (
            <span className={cn('rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border', st.color)}>
              {st.label}
            </span>
          )}
        </div>

        {/* Nota del Costista (Rechazo / Aprobación / Corrección) */}
        {msg.costistaNote && (
          <div className="rounded-xl border border-line bg-surface p-4 text-xs text-ink-soft shadow-sm leading-relaxed mt-2 text-left border-l-4 border-l-action animate-rise">
            <p className="font-bold text-ink mb-1">Nota de revisión de tu costista:</p>
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
    <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-white/15 py-1 pl-2">
      {isLoading && <p className="px-2 py-1 text-[11px] text-white/30">Cargando productos…</p>}
      {!isLoading && structures.length === 0 && (
        <p className="px-2 py-1 text-[11px] text-white/30">Sin productos cargados</p>
      )}
      {structures.length > 0 && (
        <button
          type="button"
          onClick={onClearStructure}
          className={cn(
            'flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors',
            activeStructureId === null ? 'font-medium text-white' : 'text-white/40 hover:text-white',
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
            'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors',
            activeStructureId === s.id
              ? 'bg-white/10 font-medium text-white shadow-inner'
              : 'text-white/60 hover:bg-white/5 hover:text-white',
          )}
          title={`${s.productName} · ${s.period}`}
        >
          <Package className="size-3 shrink-0 opacity-70" />
          <span className="truncate">{s.productName}</span>
          <span className="ml-auto shrink-0 text-[10px] text-white/30">{s.period}</span>
        </button>
      ))}
    </div>
  );
}


