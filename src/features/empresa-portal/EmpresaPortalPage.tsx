import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, CheckCircle2, ArrowLeft, Upload } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CosteARLogo } from '@/components/layout/CosteARLogo';

// Import modular components
import { SidebarDock } from './components/SidebarDock';
import { CompanyStructuresList } from './components/StructureSelector';
import { ChatTimeline, Submission } from './components/ChatTimeline';
import { ChatComposer } from './components/ChatComposer';
import { SubmissionGrid } from './components/SubmissionGrid';

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string).split(',')[1]) ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main component ───────────────────────────────────────────────────────────

export function EmpresaPortalPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  // Tab activa del menú del operador: chat, feed (list), o invite (unirse)
  const [activeTab, setActiveTab] = useState<'chat' | 'feed' | 'invite'>('chat');

  // Empresa y estructura activa
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [activeStructureId, setActiveStructureId] = useState<string | null>(null);
  const [activeStructureName, setActiveStructureName] = useState<string | null>(null);

  // Formulario de Carga
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Código de invitación
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

  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery<Submission[]>({
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

  // Scroll automático en el chat al cargar o recibir mensajes
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [submissions, activeTab]);

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
      setTimeout(() => {
        setInviteSuccess(null);
        setActiveTab('chat');
      }, 2000);
    },
    onError: (e) => setInviteError(apiErrorMessage(e)),
  });

  // ── Send document ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if ((!text.trim() && !file) || sending) return;
    if (!activeConnectionId) {
      setSendError('Seleccioná una empresa primero.');
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
      setSendError(null);
      qc.invalidateQueries({ queryKey: ['my-submissions', activeConnectionId, activeStructureId] });
    } catch (e) {
      setSendError(apiErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  // ── Pantalla de bienvenida cuando no hay empresas activas ────────────────────

  if (companies.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-surface-alt px-4 font-sans">
        <div className="w-full max-w-sm">
          {/* Volver atrás */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-1 text-[13px] text-ink-soft transition-colors hover:text-granate font-medium"
          >
            <ArrowLeft className="size-4" /> Volver
          </button>

          {/* Logo */}
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-[14px] bg-surface text-granate shadow-md">
              <CosteARLogo className="h-5 w-auto text-granate" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-granate font-outfit">CosteAR</span>
          </div>

          {/* Card */}
          <Card className="p-6">
            <div className="mb-5 flex size-12 items-center justify-center rounded-[18px] bg-granate-tenue text-granate shadow-inner">
              <Upload className="size-5" />
            </div>

            <h1 className="mb-1.5 text-lg font-extrabold tracking-tight text-ink font-outfit">Hola, {user?.name?.split(' ')[0] ?? 'operador'}</h1>
            <p className="mb-5 text-[13px] text-ink-soft leading-relaxed">
              Tu cuenta de operador está lista. Ingresá el código de invitación que te envió tu costista para vincular tu empresa.
            </p>

            {inviteSuccess ? (
              <div className="rounded-2xl border border-ok/20 bg-ok/10 px-4 py-3">
                <p className="text-[13px] font-semibold text-ok">✅ {inviteSuccess}</p>
                <p className="mt-1 text-[12px] text-ok/80">Cargando tus accesos…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Código de invitación"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
                  placeholder="Ej: METAL-A3F2B1"
                  error={inviteError ?? undefined}
                  className="font-mono tracking-wide"
                />
                <Button
                  onClick={() => acceptInvite.mutate(inviteCode.trim())}
                  disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                  loading={acceptInvite.isPending}
                  className="w-full py-3"
                >
                  Acceder a la empresa
                </Button>
                <p className="text-center text-[11px] text-ink-soft/70">
                  ¿No tenés un código? Solicitáselo al costista a cargo.
                </p>
              </div>
            )}
          </Card>

          {/* Logout */}
          <button
            onClick={() => { useAuthStore.getState().clear(); window.location.href = '/login'; }}
            className="mt-6 w-full text-center text-xs font-semibold text-ink-soft/60 hover:text-granate transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Render Principal (Con el Dock Premium del Costista) ─────────────────────

  return (
    <div className="flex h-screen bg-surface-alt font-sans relative overflow-hidden">
      {/* 1. DOCK VERTICAL FLOTANTE (Idéntico visualmente al del Costista) */}
      <SidebarDock activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. BARRA DE NAVEGACIÓN FLOTANTE EN MOBILE */}
      <nav className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-30 grid grid-cols-3 gap-1 rounded-[28px] bg-granate p-2 shadow-[0_16px_40px_rgba(74,21,27,0.18)] lg:hidden">
        {[
          { id: 'chat' as const, label: 'Charla IA' },
          { id: 'feed' as const, label: 'Envíos' },
          { id: 'invite' as const, label: 'Vincular' },
        ].map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-all rounded-[20px] text-white/60',
                active && 'bg-surface-alt text-granate'
              )}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. CONTENEDOR PRINCIPAL CON LAYOUT DE DOS COLUMNAS (Estilo Costista) */}
      <div className="flex-1 flex flex-col lg:pl-[104px] h-screen overflow-hidden">
        
        {/* Header Principal con la Tarjetita de Contexto Estilo Costista */}
        <header className="h-16 shrink-0 border-b border-line bg-surface px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-granate-deep/70 bg-granate-tenue/60 px-3 py-1 rounded-full border border-granate/10 inline-block font-sans">
              Portal de Operario
            </span>
            <span className="text-xs text-ink-soft hidden sm:inline-block">
              {activeCompany ? `· Operando en ${activeCompany.connection.company.name}` : '· Seleccioná una empresa'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {companies.length > 1 && (
              <Button variant="secondary" size="sm" onClick={() => setShowCompanyPicker(true)}>
                <Building2 className="size-4 mr-1.5" /> Cambiar empresa
              </Button>
            )}
            {/* Tarjetita del perfil del costista / operario */}
            <div className="hidden items-center gap-2.5 rounded-full border border-line bg-surface-alt/80 px-3.5 py-1.5 shadow-sm lg:flex">
              <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-granate-tenue text-[10.5px] font-extrabold text-granate border border-granate/10">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
              <div className="text-left leading-none pr-1">
                <p className="text-[11.5px] font-bold text-ink">{user?.name ?? 'Usuario'}</p>
                <p className="text-[8.5px] text-ink-soft mt-0.5 font-bold uppercase tracking-wider">Operador</p>
              </div>
            </div>
          </div>
        </header>

        {/* Zona de Trabajo */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* A. Selector Lateral de Productos/Estructuras */}
          <aside className="hidden md:block w-64 border-r border-line bg-surface overflow-y-auto p-4 shrink-0">
            <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-widest text-ink-soft/60">Estructuras / Meses</p>
            {activeConnectionId ? (
              <CompanyStructuresList
                connectionId={activeConnectionId}
                activeStructureId={activeStructureId}
                onSelectStructure={(id, name) => {
                  setActiveStructureId(id);
                  setActiveStructureName(name);
                }}
                onClearStructure={() => {
                  setActiveStructureId(null);
                  setActiveStructureName(null);
                }}
              />
            ) : (
              <p className="text-xs text-ink-soft px-2 py-3">Seleccioná una empresa para ver sus productos.</p>
            )}
          </aside>

          {/* B. Área de Contenido Principal */}
          <main className="flex-1 flex flex-col min-w-0 bg-surface-alt relative">
            
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <ChatTimeline
                  submissions={submissions}
                  activeStructureName={activeStructureName}
                  costistName={activeCompany?.connection.costist?.name ?? 'Soporte'}
                  chatBottomRef={chatBottomRef}
                  sending={sending}
                />
                <ChatComposer
                  text={text}
                  setText={setText}
                  file={file}
                  setFile={setFile}
                  fileError={fileError}
                  setFileError={setFileError}
                  sendError={sendError}
                  sending={sending}
                  activeConnectionId={activeConnectionId}
                  activeStructureId={activeStructureId}
                  onSelectStructure={(id, name) => {
                    setActiveStructureId(id);
                    setActiveStructureName(name);
                  }}
                  onSend={handleSend}
                />
              </div>
            )}

            {activeTab === 'feed' && (
              <SubmissionGrid
                submissions={submissions}
                isLoadingSubmissions={isLoadingSubmissions}
                activeStructureName={activeStructureName}
                onNavigateToChat={() => setActiveTab('chat')}
              />
            )}

            {activeTab === 'invite' && (
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-28 lg:pb-8">
                <div className="max-w-md mx-auto space-y-6 mt-6">
                  <div className="border-b border-line pb-3">
                    <h2 className="text-base font-extrabold text-granate-deep font-outfit">Vincularme a una nueva empresa</h2>
                    <p className="text-xs text-ink-soft">Unite a otra empresa ingresando el código enviado por tu costista.</p>
                  </div>

                  <Card className="p-6">
                    <CardBody className="p-0 space-y-4">
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Si prestás servicios como operador de carga para múltiples PyMEs, podés ingresar códigos de vinculación adicionales para unificarlos en tu cuenta.
                      </p>

                      {inviteSuccess ? (
                        <div className="rounded-2xl border border-ok/20 bg-ok/10 px-4 py-3 text-center">
                          <CheckCircle2 className="mx-auto size-8 text-ok animate-bounce mb-1" />
                          <p className="text-sm font-semibold text-ok">{inviteSuccess}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Input
                            label="Código de invitación"
                            value={inviteCode}
                            onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
                            placeholder="Ej: METAL-A3F2B1"
                            error={inviteError ?? undefined}
                            className="font-mono tracking-wide"
                          />
                          <Button
                            onClick={() => acceptInvite.mutate(inviteCode.trim())}
                            disabled={inviteCode.trim().length < 5 || acceptInvite.isPending}
                            loading={acceptInvite.isPending}
                            className="w-full py-3"
                          >
                            Unirme a la empresa
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. MODAL SELECTOR DE EMPRESAS */}
      {showCompanyPicker && companies.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-surface p-6 shadow-xl border border-line animate-rise">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold tracking-tight text-ink font-outfit">¿Qué empresa querés ver?</h2>
              <button type="button" onClick={() => setShowCompanyPicker(false)} className="text-ink-soft hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hidden">
              {companies.map((c) => (
                <button
                  key={c.connectionId}
                  type="button"
                  onClick={() => {
                    setActiveConnectionId(c.connectionId);
                    setShowCompanyPicker(false);
                    setActiveStructureId(null);
                    setActiveStructureName(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-action/40 hover:bg-granate-tenue transition-all"
                >
                  <Building2 className="size-5 text-action shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{c.connection.company.name}</p>
                    {c.connection.company.industry && (
                      <p className="text-xs text-ink-soft truncate">{c.connection.company.industry}</p>
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
