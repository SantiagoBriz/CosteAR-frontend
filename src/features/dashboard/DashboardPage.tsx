import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CostitaChat } from './CostitaChat';
import {
  Building2, Bell, ArrowRight, ClipboardCheck,
  DollarSign, AlertTriangle, CheckCircle2, FileText,
  ChevronRight, Activity, Percent, Search, FileInput,
  Image, MessageSquare, User, Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useCompanies } from '@/features/companies/company-hooks';
import { useAlerts } from '@/features/alerts/alert-hooks';
import { usePendingCount, usePendingEntries, useAttention } from '@/features/validaciones/validaciones-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import type { MacroSnapshot } from '@/lib/types';

// Hook: últimos docs aprobados para "Documentos recientes"
function useRecentDocs() {
  return useQuery({
    queryKey: ['automatizacion', 'feed'],
    queryFn: async () => {
      const res = await api.get<{ data: RecentDoc[]; total: number }>('/validaciones/feed');
      return res.data.data
        .filter((d) => d.status === 'APPROVED')
        .slice(0, 5);
    },
    staleTime: 2 * 60 * 1000,
  });
}

interface RecentDoc {
  id: string;
  status: string;
  sourceType: 'TEXT' | 'PDF' | 'IMAGE' | 'WHATSAPP';
  fileName: string | null;
  rawContent: string;
  createdAt: string;
  connection: { company: { id: string; name: string } };
  classificationAudits: Array<{ documentType: string; costSection: string }>;
}

const SOURCE_ICON: Record<string, typeof FileText> = {
  TEXT: FileText, PDF: FileInput, IMAGE: Image, WHATSAPP: MessageSquare,
};

// Colores por sector/industria (Tailwind CSS HSL armonizados)
const INDUSTRY_COLORS: Record<string, string> = {
  'Agropecuaria':     'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Manufactura':      'bg-indigo-50 text-indigo-700 border-indigo-100',
  'Transporte':       'bg-purple-50 text-purple-700 border-purple-100',
  'Construcción':     'bg-amber-50 text-amber-800 border-amber-100',
  'Comercio':         'bg-pink-50 text-pink-700 border-pink-100',
  'Servicios':        'bg-sky-50 text-sky-700 border-sky-100',
  'Logística':        'bg-violet-50 text-violet-700 border-violet-100',
  'Gastronomía':      'bg-orange-50 text-orange-700 border-orange-100',
  'Salud':            'bg-teal-50 text-teal-700 border-teal-100',
  'Tecnología':       'bg-emerald-50 text-emerald-700 border-emerald-100',
};

function industryChip(industry: string | null | undefined): string {
  if (!industry) return 'bg-zinc-50 text-zinc-500 border-zinc-100';
  for (const [key, classes] of Object.entries(INDUSTRY_COLORS)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return classes;
  }
  const keys = Object.keys(INDUSTRY_COLORS);
  const fallbackKey = keys[(industry.charCodeAt(0) ?? 0) % keys.length]!;
  return INDUSTRY_COLORS[fallbackKey]!;
}

// Health indicator por empresa
function companyHealth(structCount: number): { label: string; color: string; dot: string; bg: string } {
  if (structCount === 0) return { label: 'Sin datos',  color: 'text-zinc-400',   dot: 'bg-zinc-300',   bg: 'bg-zinc-100' };
  if (structCount <= 1)  return { label: 'Inicial',    color: 'text-amber-600',  dot: 'bg-amber-400',  bg: 'bg-amber-50' };
  if (structCount <= 3)  return { label: 'En progreso',color: 'text-blue-600',   dot: 'bg-blue-400',   bg: 'bg-blue-50' };
  return                         { label: 'Activo',    color: 'text-emerald-600',dot: 'bg-emerald-500',bg: 'bg-emerald-50' };
}

function useMacroLatest() {
  return useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

function greet(name?: string | null) {
  const h = new Date().getHours();
  const firstName = name?.split(' ')[0] ?? 'costista';
  if (h < 12) return `Buenos días, ${firstName}`;
  if (h < 19) return `Buenas tardes, ${firstName}`;
  return `Buenas noches, ${firstName}`;
}

function avatarColor(name: string) {
  const colors = [
    ['bg-indigo-50 text-indigo-700 border-indigo-150', 'bg-indigo-600'],
    ['bg-pink-50 text-pink-700 border-pink-150', 'bg-pink-600'],
    ['bg-emerald-50 text-emerald-700 border-emerald-150', 'bg-emerald-600'],
    ['bg-purple-50 text-purple-700 border-purple-150', 'bg-purple-600'],
    ['bg-orange-50 text-orange-700 border-orange-150', 'bg-orange-600'],
    ['bg-amber-50 text-amber-800 border-amber-150', 'bg-amber-600'],
    ['bg-sky-50 text-sky-700 border-sky-150', 'bg-sky-600'],
  ];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i]!;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: companies = [] } = useCompanies();
  const { data: alerts = [] } = useAlerts();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: pendingEntries } = usePendingEntries(1);
  const { data: attention = [] } = useAttention();
  const { data: macro = [] } = useMacroLatest();
  const { data: recentDocs = [] } = useRecentDocs();
  const [search, setSearch] = useState('');

  const filteredCompanies = search
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.industry ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : companies;

  const totalStructures = companies.reduce((acc, c) => acc + (c._count?.costStructures ?? 0), 0);
  const companiesWithStructure = companies.filter((c) => (c._count?.costStructures ?? 0) > 0).length;
  const unread = alerts.filter((a) => !a.isRead).length;
  const dolarOficial = macro.find((m) => m.indicatorCode === 'USD_OFICIAL');
  const ipc = macro.find((m) => m.indicatorCode === 'IPC_NACIONAL');

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const pendingByCompany = (pendingEntries?.items ?? []).reduce<
    Map<string, { name: string; count: number; fileNames: string[] }>
  >((map, entry) => {
    const { id, name } = entry.connection.company;
    if (!map.has(id)) map.set(id, { name, count: 0, fileNames: [] });
    const g = map.get(id)!;
    g.count++;
    if (entry.fileName) g.fileNames.push(entry.fileName);
    return map;
  }, new Map());

  return (
    <AppShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .font-syne {
          font-family: 'Syne', sans-serif;
        }
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
        .font-mono-jb {
          font-family: 'JetBrains Mono', monospace;
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-gentle {
          animation: float-gentle 4s ease-in-out infinite;
        }
      `}</style>

      <div className="font-outfit pb-12 animate-rise">

        {/* ── HEADER DE BIENVENIDA CON GLOW ───────────────────────────────────── */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-granate-tenue/40 via-white to-white p-6 sm:p-8 shadow-sm">
          {/* Ambient Glow */}
          <div className="absolute right-[-10%] top-[-20%] h-[300px] w-[300px] rounded-full bg-granate-tenue opacity-60 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-granate/80 bg-granate-tenue px-3 py-1 rounded-full border border-granate/10">
                {today}
              </span>
              <h1 className="font-syne text-[32px] font-extrabold leading-tight text-ink tracking-tight mt-2 flex items-center gap-2">
                {greet(user?.name)}
                <Sparkles className="size-6 text-action animate-float-gentle" />
              </h1>
              <p className="text-xs text-ink-soft/90 max-w-lg">
                Monitoreá y gestioná las estructuras de costos y actualizaciones macro de tu cartera.
              </p>
            </div>

            {/* Macro indicators right aligned */}
            <div className="flex flex-wrap items-center gap-3">
              {dolarOficial && (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-2.5 shadow-sm">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <DollarSign className="size-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Dolar Oficial</p>
                    <p className="font-mono-jb text-[14px] font-bold text-ink leading-tight mt-0.5">
                      {fmtARS(Number(dolarOficial.value))}
                    </p>
                  </div>
                </div>
              )}
              {ipc && (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-2.5 shadow-sm">
                  <div className={cn(
                    'flex size-8 items-center justify-center rounded-xl',
                    Number(ipc.value) >= 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  )}>
                    <Percent className="size-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">IPC Mensual</p>
                    <p className={cn(
                      'font-mono-jb text-[14px] font-bold leading-tight mt-0.5',
                      Number(ipc.value) >= 5 ? 'text-danger' : 'text-ok'
                    )}>
                      {Number(ipc.value) > 0 ? '+' : ''}{Number(ipc.value).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── KPIs DE PRECISIÓN ────────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Clientes Activos"
            value={companies.length}
            sub={`${companiesWithStructure} con estructura activa`}
            icon={Building2}
            to="/companies"
            variant="neutral"
          />
          <StatCard
            label="Por Validar"
            value={pendingCount}
            sub={pendingCount > 0 ? 'Requieren tu revisión' : 'Centro al día ✓'}
            icon={ClipboardCheck}
            to="/validaciones"
            variant={pendingCount > 0 ? 'urgent' : 'ok'}
          />
          <StatCard
            label="Alertas Activas"
            value={unread}
            sub={unread > 0 ? `${unread} sin revisar` : 'Sin novedades ✓'}
            icon={Bell}
            to="/alerts"
            variant={unread > 0 ? 'warn' : 'ok'}
          />
          <StatCard
            label="Estructuras de Costos"
            value={totalStructures}
            sub={`En toda la cartera`}
            icon={Activity}
            to="/companies"
            variant="neutral"
          />
        </div>

        {/* ── ATENCIÓN URGENTE (Cruza cartera) ─────────────────────────────────── */}
        {attention.some((a) => a.needsAttention) && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-line bg-zinc-50/50 px-6 py-4">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-syne text-[14px] font-extrabold text-ink">Necesita atención inmediata</h2>
            </div>
            <div className="divide-y divide-line">
              {attention.filter((a) => a.needsAttention).map((a) => (
                <Link
                  key={a.companyId}
                  to="/validaciones"
                  className="flex items-center justify-between px-6 py-4.5 hover:bg-zinc-50/40 transition-colors group"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-[13.5px] font-bold text-ink group-hover:text-granate transition-colors">{a.companyName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      {a.conflicts > 0 && (
                        <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 font-bold uppercase tracking-wider">
                          {a.conflicts} discrepancia{a.conflicts !== 1 ? 's' : ''}
                        </span>
                      )}
                      {a.pending > 0 && (
                        <span className="rounded-full bg-red-50 text-red-700 border border-red-100 px-2.5 py-0.5 font-bold uppercase tracking-wider">
                          {a.pending} pendiente{a.pending !== 1 ? 's' : ''}
                        </span>
                      )}
                      {a.daysSinceActivity != null && a.daysSinceActivity >= 14 && (
                        <span className="rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/60 px-2.5 py-0.5 font-semibold">
                          Sin actividad hace {a.daysSinceActivity} días
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-zinc-400 group-hover:text-granate group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── DOCUMENTOS ESPERANDO VALIDACIÓN ────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-action/20 bg-surface shadow-sm">
            <div className="flex flex-col gap-4 border-b border-action/10 bg-action/5 px-6 py-4.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-action text-[11px] font-bold text-white shadow-sm">
                  {pendingCount}
                </span>
                <div>
                  <h2 className="font-syne text-[14px] font-extrabold text-granate-deep">Documentos pendientes de aprobación</h2>
                  <p className="text-[11px] text-ink-soft mt-0.5">El clasificador procesó estos archivos que requieren revisión humana</p>
                </div>
              </div>
              <Link to="/validaciones" className="shrink-0">
                <Button size="sm" className="rounded-full bg-action hover:bg-action-soft text-white font-bold py-2.5 px-4 shadow-sm shadow-action/10">
                  Revisar Todo <ChevronRight className="size-4 ml-1" />
                </Button>
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {[...pendingByCompany.entries()].map(([cid, { name, count, fileNames }]) => {
                const [avBg, avText] = avatarColor(name);
                return (
                  <li key={cid}>
                    <Link
                      to="/validaciones"
                      className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50/40 transition-colors group"
                    >
                      <span
                        className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold border", avBg, avText)}
                      >
                        {name[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-ink group-hover:text-granate transition-colors">{name}</p>
                        <p className="truncate text-[11px] text-ink-soft/70 mt-0.5">
                          {fileNames.slice(0, 2).join(' · ')}
                          {count > 2 ? ` · y +${count - 2} más` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-[11px] font-bold text-red-600">
                        {count} doc{count !== 1 ? 's' : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── GRILLA PRINCIPAL DE DOS COLUMNAS ─────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">

          {/* COLUMNA IZQUIERDA: CARTERA DE CLIENTES */}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            
            {/* Header de Cartera con Búsqueda */}
            <div className="border-b border-line px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-syne text-[15px] font-extrabold text-ink tracking-tight">
                    Monitoreo de Cartera
                  </h2>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    {companies.length} cliente{companies.length !== 1 ? 's' : ''} registrado{companies.length !== 1 ? 's' : ''}
                    {search ? ` · ${filteredCompanies.length} coincidencia${filteredCompanies.length !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search box */}
                  <div className="flex items-center gap-2 rounded-full border border-line bg-surface-alt px-3.5 py-1.5 focus-within:border-granate/40 focus-within:bg-white transition-all shadow-inner">
                    <Search className="size-3.5 text-zinc-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar empresa..."
                      className="w-32 bg-transparent text-[11.5px] text-ink placeholder-zinc-400 outline-none"
                    />
                  </div>
                  <Link to="/companies">
                    <Button variant="secondary" size="sm" className="rounded-full text-xs font-bold border-line text-ink-soft hover:text-granate">
                      Ver Todos <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-6 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-granate-tenue text-granate">
                  <Building2 className="size-7" />
                </div>
                <p className="text-[14px] font-bold text-ink">Sin clientes activos</p>
                <p className="mt-1 text-[11.5px] text-ink-soft max-w-xs">Agregá tu primer cliente para comenzar a procesar estructuras de costos.</p>
                <Link to="/companies" className="mt-5">
                  <Button size="sm" className="rounded-full bg-granate hover:bg-granate-deep text-white font-bold py-2.5 px-5 shadow-sm">
                    Agregar Cliente
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_120px_60px_100px] gap-x-4 border-b border-line bg-zinc-50/50 px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                  <span>Empresa / PyME</span>
                  <span>Sector de Actividad</span>
                  <span className="text-center">Estructuras</span>
                  <span className="text-right">Estado</span>
                </div>

                {filteredCompanies.length === 0 && search ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <p className="text-[13px] text-ink-soft">Sin resultados para <strong>"{search}"</strong></p>
                    <button onClick={() => setSearch('')} className="mt-2 text-[12px] text-action font-semibold hover:underline">
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {filteredCompanies.map((c) => {
                      const structs = c._count?.costStructures ?? 0;
                      const [avBg, avText] = avatarColor(c.name);
                      const chipBg = industryChip(c.industry);
                      const health = companyHealth(structs);
                      const pending = pendingByCompany.get(c.id);
                      return (
                        <li key={c.id}>
                          <Link
                            to="/companies/$id"
                            params={{ id: c.id }}
                            className="grid grid-cols-[1fr_120px_60px_100px] items-center gap-x-4 px-6 py-3.5 hover:bg-zinc-50/40 transition-colors group"
                          >
                            {/* Empresa */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span
                                className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold border", avBg, avText)}
                              >
                                {c.name[0]?.toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-bold text-ink group-hover:text-granate transition-colors">{c.name}</p>
                                {pending && (
                                  <span className="inline-flex items-center text-[10px] font-bold text-red-600 mt-0.5">
                                    {pending.count} pendiente{pending.count !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sector */}
                            <span
                              className={cn("inline-block truncate rounded-full px-2.5 py-0.5 text-[9.5px] font-bold border text-center whitespace-nowrap self-center justify-self-start", chipBg)}
                            >
                              {c.industry ?? 'General'}
                            </span>

                            {/* Estructuras */}
                            <span className={cn(
                              'text-center font-mono-jb text-[12.5px] font-bold leading-none self-center',
                              structs > 0 ? 'text-ink' : 'text-zinc-300',
                            )}>
                              {structs}
                            </span>

                            {/* Salud */}
                            <div className="flex items-center gap-1.5 justify-end self-center">
                              <span className={cn('size-1.5 rounded-full flex-shrink-0', health.dot)} />
                              <span className={cn('text-[10px] font-bold uppercase tracking-wider', health.color)}>
                                {health.label}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* COLUMNA DERECHA: SIDEBAR DE ALERTAS Y ACCIONES */}
          <div className="flex flex-col gap-6">

            {/* Panel de Alertas */}
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-syne text-[13.5px] font-extrabold text-ink flex items-center gap-2">
                  Alertas de Desvío
                  {unread > 0 && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {unread}
                    </span>
                  )}
                </h2>
                {unread > 0 && (
                  <Link to="/alerts">
                    <button className="text-[11px] font-bold text-granate hover:text-action transition-colors">
                      Ver todas →
                    </button>
                  </Link>
                )}
              </div>
              {unread === 0 ? (
                <div className="flex items-center gap-3 px-5 py-6">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <p className="text-[12px] text-ink-soft">Sin alertas de desvío activas</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {alerts.filter((a) => !a.isRead).slice(0, 3).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-4 hover:bg-zinc-50/20 transition-colors">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <div className="space-y-0.5">
                        <p className="text-[12px] leading-relaxed text-ink font-medium">{a.message}</p>
                        <p className="text-[10px] text-ink-soft/70">{formatDate(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Documentos Recientes */}
            {recentDocs.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 className="font-syne text-[13.5px] font-extrabold text-ink">
                    Documentos Procesados
                  </h2>
                  <Link to="/automatizacion">
                    <button className="text-[11px] font-bold text-granate hover:text-action transition-colors">
                      Ver todo →
                    </button>
                  </Link>
                </div>
                <ul className="divide-y divide-line">
                  {recentDocs.map((doc) => {
                    const SrcIcon = SOURCE_ICON[doc.sourceType] ?? FileText;
                    const audit = doc.classificationAudits[0];
                    return (
                      <li key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/20 transition-colors group">
                        <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-line text-zinc-400 group-hover:text-granate transition-colors">
                          <SrcIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold text-ink">
                            {doc.connection.company.name}
                          </p>
                          <p className="truncate text-[10px] text-ink-soft/75 mt-0.5">
                            {audit?.documentType ?? 'Comprobante'} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Acciones Rápidas */}
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-syne text-[13.5px] font-extrabold text-ink">
                  Accesos Rápidos
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5 p-4 bg-zinc-50/30">
                <Link to="/companies" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-granate-tenue text-granate">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-ink leading-tight">Nuevo Cliente</p>
                    <p className="text-[9.5px] text-ink-soft mt-0.5">Alta de empresa</p>
                  </div>
                </Link>
                <Link to="/validaciones" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-granate-tenue text-granate">
                    <ClipboardCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-ink leading-tight">Validaciones</p>
                    <p className="text-[9.5px] text-ink-soft mt-0.5">{pendingCount} pendientes</p>
                  </div>
                </Link>
                <Link to="/alerts" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-granate-tenue text-granate">
                    <Bell className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-ink leading-tight">Alertas</p>
                    <p className="text-[9.5px] text-ink-soft mt-0.5">{unread} activas</p>
                  </div>
                </Link>
                <Link to="/profile" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-granate-tenue text-granate">
                    <User className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-ink leading-tight">Mi Perfil</p>
                    <p className="text-[9.5px] text-ink-soft mt-0.5">Configuración</p>
                  </div>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Chatbot IA Costista (Flotante) ────────────────────────────────────── */}
      <CostitaChat companies={companies} />
    </AppShell>
  );
}

// ── Stat Card Component (Rediseñado Premium) ──────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, to, variant,
}: {
  label: string;
  value: number;
  sub: string;
  icon: typeof Building2;
  to: string;
  variant: 'neutral' | 'urgent' | 'warn' | 'ok';
}) {
  const styles = {
    neutral: { card: 'border-line hover:border-granate/20', num: 'text-ink', icon: 'bg-zinc-100 text-zinc-500', dot: '' },
    urgent:  { card: 'border-red-200 bg-red-50/10 hover:border-red-300', num: 'text-red-700', icon: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    warn:    { card: 'border-amber-200 bg-amber-50/10 hover:border-amber-300', num: 'text-amber-700', icon: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500 animate-pulse' },
    ok:      { card: 'border-emerald-200 bg-emerald-50/5 hover:border-emerald-300', num: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600', dot: '' },
  }[variant];

  return (
    <Link to={to} className="group">
      <div className={cn(
        'relative rounded-3xl border bg-surface p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 shadow-sm',
        styles.card,
      )}>
        {styles.dot && (
          <span className={cn('absolute right-4 top-4 size-2 rounded-full', styles.dot)} />
        )}
        <div className={cn('mb-3 flex size-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105 duration-300', styles.icon)}>
          <Icon className="size-4" />
        </div>
        <p
          className={cn('font-mono-jb text-[34px] leading-none tracking-tight font-bold', styles.num)}
        >
          {value}
        </p>
        <p className="mt-2 text-[12px] font-bold text-ink leading-tight">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-soft/75">{sub}</p>
      </div>
    </Link>
  );
}
