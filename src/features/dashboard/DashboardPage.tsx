import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CostitaChat } from './CostitaChat';
import {
  Building2, Bell, ArrowRight, ClipboardCheck,
  DollarSign, AlertTriangle, CheckCircle2, FileText,
  ChevronRight, Activity, Percent, Search, FileInput,
  Image, MessageSquare, User, ShieldCheck,
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

// Colores sofisticados para los sectores de la cartera (Muted HSL)
const INDUSTRY_CLASSES: Record<string, string> = {
  'Agropecuaria':     'bg-zinc-100 text-zinc-800 border-zinc-200/60',
  'Manufactura':      'bg-granate-tenue/60 text-granate border-granate/10',
  'Transporte':       'bg-zinc-100 text-zinc-800 border-zinc-200/60',
  'Construcción':     'bg-zinc-105 text-zinc-900 border-zinc-250',
  'Comercio':         'bg-granate-tenue/60 text-granate border-granate/10',
  'Servicios':        'bg-zinc-100 text-zinc-850 border-zinc-200/60',
  'Logística':        'bg-zinc-100 text-zinc-800 border-zinc-200/60',
  'Gastronomía':      'bg-granate-tenue/60 text-granate border-granate/10',
  'Salud':            'bg-zinc-100 text-zinc-850 border-zinc-200/60',
  'Tecnología':       'bg-granate-tenue/60 text-granate border-granate/10',
};

function industryChip(industry: string | null | undefined): string {
  if (!industry) return 'bg-zinc-50 text-zinc-400 border-zinc-100';
  for (const [key, classes] of Object.entries(INDUSTRY_CLASSES)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return classes;
  }
  return 'bg-zinc-100 text-zinc-800 border-zinc-200/60';
}

function companyHealth(structCount: number): { label: string; color: string; dot: string } {
  if (structCount === 0) return { label: 'Sin datos',  color: 'text-zinc-400',   dot: 'bg-zinc-300' };
  if (structCount <= 1)  return { label: 'Inicial',    color: 'text-zinc-500',  dot: 'bg-zinc-400' };
  if (structCount <= 3)  return { label: 'En progreso',color: 'text-granate',   dot: 'bg-action-soft' };
  return                         { label: 'Activo',    color: 'text-emerald-700',dot: 'bg-emerald-500' };
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
        
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -15px) scale(1.05); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 15px) scale(1.03); }
        }
        .animate-orb-1 {
          animation: orbFloat1 15s ease-in-out infinite;
        }
        .animate-orb-2 {
          animation: orbFloat2 18s ease-in-out infinite;
        }
      `}</style>

      {/* ── CONTEXTO CON GLOWS AMBIENTALES DE LA BRAND ─────────────────────────── */}
      <div className="relative font-outfit pb-12 overflow-hidden px-1">
        {/* Glows de fondo idénticos a los del Login para dar coherencia y profundidad */}
        <div className="pointer-events-none absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-granate-tenue opacity-60 blur-[130px] animate-orb-1 z-0" />
        <div className="pointer-events-none absolute right-[-10%] bottom-[10%] h-[450px] w-[450px] rounded-full bg-action-soft/5 opacity-40 blur-[120px] animate-orb-2 z-0" />

        <div className="relative z-10 space-y-6">

          {/* ── HEADER DE BIENVENIDA (Glassmorphism sobrio y limpio) ───────────── */}
          <div className="flex flex-col gap-6 border-b border-line/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-granate-deep/70 bg-granate-tenue/60 px-3 py-1 rounded-full border border-granate/10">
                {today}
              </span>
              <h1 className="font-syne text-[30px] font-extrabold leading-tight text-granate-deep tracking-tight pt-1">
                {greet(user?.name)}
              </h1>
              <p className="text-xs text-ink-soft">
                Revisión diaria de la cartera de clientes y variaciones de costos.
              </p>
            </div>

            {/* Macro strip (Glass minimalista sin colores primarios invasivos) */}
            <div className="flex flex-wrap items-center gap-3">
              {dolarOficial && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface/60 px-4 py-2 backdrop-blur-md">
                  <DollarSign className="size-4 text-granate" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Dólar Oficial</p>
                    <p className="font-mono-jb text-[14.5px] font-bold text-ink leading-none mt-0.5">
                      {fmtARS(Number(dolarOficial.value))}
                    </p>
                  </div>
                </div>
              )}
              {ipc && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface/60 px-4 py-2 backdrop-blur-md">
                  <Percent className="size-4 text-granate" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">IPC Mensual</p>
                    <p className="font-mono-jb text-[14.5px] font-bold text-ink leading-none mt-0.5">
                      {Number(ipc.value) > 0 ? '+' : ''}{Number(ipc.value).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── KPIs (Estilo Tarjetas del Login: Vidrio + Sombras Profundas) ────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Clientes Activos"
              value={companies.length}
              sub={`${companiesWithStructure} con estructura`}
              icon={Building2}
              to="/companies"
              variant="neutral"
            />
            <StatCard
              label="Por Validar"
              value={pendingCount}
              sub={pendingCount > 0 ? 'Revisión pendiente' : 'Sin pendientes'}
              icon={ClipboardCheck}
              to="/validaciones"
              variant={pendingCount > 0 ? 'urgent' : 'ok'}
            />
            <StatCard
              label="Alertas Activas"
              value={unread}
              sub={unread > 0 ? `${unread} desvíos` : 'Sin alertas'}
              icon={Bell}
              to="/alerts"
              variant={unread > 0 ? 'warn' : 'ok'}
            />
            <StatCard
              label="Estructuras Totales"
              value={totalStructures}
              sub="Modelos de costos"
              icon={Activity}
              to="/companies"
              variant="neutral"
            />
          </div>

          {/* ── ATENCIÓN INMEDIATA (Sutil y elegante, sin rojo chillón) ───────── */}
          {attention.some((a) => a.needsAttention) && (
            <div className="overflow-hidden rounded-3xl border border-line/65 bg-surface/70 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-2 border-b border-line bg-zinc-50/40 px-6 py-3.5">
                <div className="size-1.5 rounded-full bg-action animate-pulse" />
                <h2 className="font-syne text-[13px] font-extrabold text-granate uppercase tracking-wider">Requiere atención</h2>
              </div>
              <div className="divide-y divide-line/65">
                {attention.filter((a) => a.needsAttention).map((a) => (
                  <Link
                    key={a.companyId}
                    to="/validaciones"
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50/20 transition-colors group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[13px] font-bold text-ink group-hover:text-granate transition-colors">{a.companyName}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[9.5px]">
                        {a.conflicts > 0 && (
                          <span className="rounded-full bg-granate-tenue text-granate px-2 py-0.5 font-bold uppercase tracking-wider border border-granate/5">
                            {a.conflicts} discrepancia{a.conflicts !== 1 ? 's' : ''}
                          </span>
                        )}
                        {a.pending > 0 && (
                          <span className="rounded-full bg-granate-tenue text-granate px-2 py-0.5 font-bold uppercase tracking-wider border border-granate/5">
                            {a.pending} pendiente{a.pending !== 1 ? 's' : ''}
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

          {/* ── DOCUMENTOS POR VALIDAR (Estructura de Tarjeta limpia con badge granate) ── */}
          {pendingCount > 0 && (
            <div className="overflow-hidden rounded-3xl border border-line bg-surface/75 backdrop-blur-md shadow-sm">
              <div className="flex flex-col gap-4 border-b border-line bg-zinc-50/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-5.5 items-center justify-center rounded-full bg-granate text-[10.5px] font-extrabold text-white shadow-sm">
                    {pendingCount}
                  </span>
                  <div>
                    <h2 className="font-syne text-[13.5px] font-extrabold text-granate-deep uppercase tracking-wider">Aprobaciones Pendientes</h2>
                    <p className="text-[10.5px] text-ink-soft">Documentos clasificados listos para confirmación</p>
                  </div>
                </div>
                <Link to="/validaciones" className="shrink-0">
                  <Button size="sm" className="rounded-full bg-granate hover:bg-granate-deep text-white font-bold py-2 px-4 text-xs shadow-md shadow-granate/10">
                    Revisar Todo <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
              <ul className="divide-y divide-line/65">
                {[...pendingByCompany.entries()].map(([cid, { name, count, fileNames }]) => {
                  const avColorClass = 'bg-granate-tenue text-granate border-granate/10';
                  return (
                    <li key={cid}>
                      <Link
                      to="/validaciones"
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-50/20 transition-colors group"
                    >
                      <span
                        className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold border", avColorClass)}
                      >
                        {name[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-ink group-hover:text-granate transition-colors">{name}</p>
                        <p className="truncate text-[10.5px] text-ink-soft/70">
                          {fileNames.slice(0, 2).join(' · ')}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-granate-tenue/60 border border-granate/5 px-2.5 py-0.5 text-[10.5px] font-bold text-granate">
                        {count} doc{count !== 1 ? 's' : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── SECCIÓN CENTRAL: DOS COLUMNAS DE ALTA COHERENCIA VISUAL ───────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">

          {/* COLUMNA IZQUIERDA: MONITOREO DE CARTERA */}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface/75 backdrop-blur-md shadow-sm">
            
            {/* Header de Cartera con Búsqueda */}
            <div className="border-b border-line px-6 py-4.5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-syne text-[14px] font-extrabold text-granate-deep uppercase tracking-wider">
                    Monitoreo de Cartera
                  </h2>
                  <p className="text-[10.5px] text-ink-soft mt-0.5">
                    {companies.length} cliente{companies.length !== 1 ? 's' : ''} registrado{companies.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search box (diseño redondo limpio, no choca) */}
                  <div className="flex items-center gap-2 rounded-full border border-line bg-surface-alt px-3.5 py-1 focus-within:border-granate/30 focus-within:bg-white transition-all">
                    <Search className="size-3.5 text-zinc-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-24 bg-transparent text-[11px] text-ink placeholder-zinc-400 outline-none"
                    />
                  </div>
                  <Link to="/companies">
                    <Button variant="secondary" size="sm" className="rounded-full text-[11px] font-bold px-3">
                      Ver Todos <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-6 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-granate-tenue text-granate">
                  <Building2 className="size-6" />
                </div>
                <p className="text-[13px] font-bold text-ink">Sin clientes activos</p>
                <p className="mt-1 text-[11px] text-ink-soft max-w-xs">Agregá tu primer cliente para comenzar a procesar costos.</p>
                <Link to="/companies" className="mt-4">
                  <Button size="sm" className="rounded-full bg-granate hover:bg-granate-deep text-white font-bold py-2 px-4 text-xs shadow-sm">
                    Agregar Cliente
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_110px_60px_90px] gap-x-4 border-b border-line bg-zinc-50/40 px-6 py-2.5 text-[9.5px] font-bold uppercase tracking-wider text-ink-soft">
                  <span>Empresa</span>
                  <span>Sector</span>
                  <span className="text-center">Estructuras</span>
                  <span className="text-right">Estado</span>
                </div>

                {filteredCompanies.length === 0 && search ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <p className="text-[12px] text-ink-soft">Sin resultados para <strong>"{search}"</strong></p>
                    <button onClick={() => setSearch('')} className="mt-2 text-[11px] text-action font-semibold hover:underline">
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-line/65">
                    {filteredCompanies.map((c) => {
                      const structs = c._count?.costStructures ?? 0;
                      const avColorClass = 'bg-granate-tenue text-granate border-granate/10';
                      const chipBg = industryChip(c.industry);
                      const health = companyHealth(structs);
                      const pending = pendingByCompany.get(c.id);
                      return (
                        <li key={c.id}>
                          <Link
                            to="/companies/$id"
                            params={{ id: c.id }}
                            className="grid grid-cols-[1fr_110px_60px_90px] items-center gap-x-4 px-6 py-3 hover:bg-zinc-50/20 transition-colors group"
                          >
                            {/* Empresa */}
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-xl text-[10.5px] font-bold border", avColorClass)}
                              >
                                {c.name[0]?.toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[12.5px] font-bold text-ink group-hover:text-granate transition-colors">{c.name}</p>
                                {pending && (
                                  <span className="text-[9.5px] font-bold text-action">
                                    {pending.count} pendiente{pending.count !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sector */}
                            <span
                              className={cn("inline-block truncate rounded-full px-2 py-0.5 text-[9px] font-bold border text-center whitespace-nowrap self-center justify-self-start", chipBg)}
                            >
                              {c.industry ?? 'General'}
                            </span>

                            {/* Estructuras */}
                            <span className={cn(
                              'text-center font-mono-jb text-[12px] font-bold self-center',
                              structs > 0 ? 'text-ink' : 'text-zinc-350',
                            )}>
                              {structs}
                            </span>

                            {/* Salud */}
                            <div className="flex items-center gap-1.5 justify-end self-center">
                              <span className={cn('size-1.5 rounded-full flex-shrink-0', health.dot)} />
                              <span className={cn('text-[9.5px] font-bold uppercase tracking-wider', health.color)}>
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

          {/* COLUMNA DERECHA: ALERTAS Y ACCESOS RÁPIDOS */}
          <div className="flex flex-col gap-6">

            {/* Alertas */}
            <div className="overflow-hidden rounded-3xl border border-line bg-surface/75 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-syne text-[13px] font-extrabold text-granate-deep uppercase tracking-wider flex items-center gap-2">
                  Alertas
                  {unread > 0 && (
                    <span className="rounded-full bg-action px-2 py-0.5 text-[9.5px] font-extrabold text-white">
                      {unread}
                    </span>
                  )}
                </h2>
                {unread > 0 && (
                  <Link to="/alerts">
                    <button className="text-[10px] font-bold text-granate hover:text-action transition-colors">
                      Ver todas →
                    </button>
                  </Link>
                )}
              </div>
              {unread === 0 ? (
                <div className="flex items-center gap-3 px-5 py-5.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-50 border border-line text-zinc-400">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <p className="text-[12px] text-ink-soft">Sin desvíos de costos</p>
                </div>
              ) : (
                <ul className="divide-y divide-line/65">
                  {alerts.filter((a) => !a.isRead).slice(0, 3).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50/20 transition-colors">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <div className="space-y-0.5">
                        <p className="text-[11.5px] leading-relaxed text-ink font-medium">{a.message}</p>
                        <p className="text-[9.5px] text-ink-soft/70">{formatDate(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Documentos Recientes */}
            {recentDocs.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-line bg-surface/75 backdrop-blur-md shadow-sm">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 className="font-syne text-[13px] font-extrabold text-granate-deep uppercase tracking-wider">
                    Automatización
                  </h2>
                  <Link to="/automatizacion">
                    <button className="text-[10px] font-bold text-granate hover:text-action transition-colors">
                      Ver todo →
                    </button>
                  </Link>
                </div>
                <ul className="divide-y divide-line/65">
                  {recentDocs.map((doc) => {
                    const SrcIcon = SOURCE_ICON[doc.sourceType] ?? FileText;
                    const audit = doc.classificationAudits[0];
                    return (
                      <li key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/20 transition-colors group">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-line text-zinc-400 group-hover:text-granate transition-colors">
                          <SrcIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold text-ink">
                            {doc.connection.company.name}
                          </p>
                          <p className="truncate text-[9.5px] text-ink-soft/75">
                            {audit?.documentType ?? 'Comprobante'} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Acciones Rápidas (Glass styling ultra-limpio) */}
            <div className="overflow-hidden rounded-3xl border border-line bg-surface/75 backdrop-blur-md shadow-sm">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-syne text-[13px] font-extrabold text-granate-deep uppercase tracking-wider">
                  Accesos Rápidos
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50/20">
                <Link to="/companies" className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface/70 p-3 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-granate-tenue text-granate border border-granate/5">
                    <Building2 className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink leading-tight">Clientes</p>
                    <p className="text-[9px] text-ink-soft mt-0.5">Alta de PyME</p>
                  </div>
                </Link>
                <Link to="/validaciones" className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface/70 p-3 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-granate-tenue text-granate border border-granate/5">
                    <ClipboardCheck className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink leading-tight">Validar</p>
                    <p className="text-[9px] text-ink-soft mt-0.5">{pendingCount} pendientes</p>
                  </div>
                </Link>
                <Link to="/alerts" className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface/70 p-3 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-granate-tenue text-granate border border-granate/5">
                    <Bell className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink leading-tight">Alertas</p>
                    <p className="text-[9px] text-ink-soft mt-0.5">{unread} activas</p>
                  </div>
                </Link>
                <Link to="/profile" className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface/70 p-3 hover:bg-zinc-50/50 hover:border-granate/20 transition-all shadow-sm">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-granate-tenue text-granate border border-granate/5">
                    <User className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink leading-tight">Mi Perfil</p>
                    <p className="text-[9px] text-ink-soft mt-0.5">Configuración</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Connection badge to assure security */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-soft/70">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Entorno cifrado y validado por la Cátedra</span>
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

// ── Stat Card Component (Rediseñado con Glassmorphism Fino) ───────────────
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
    neutral: { card: 'border-line/60 bg-surface/70 hover:border-granate/20', num: 'text-granate-deep', icon: 'bg-zinc-100 text-zinc-500 border-zinc-200/60', dot: '' },
    urgent:  { card: 'border-red-200/60 bg-surface/75 hover:border-red-300', num: 'text-action', icon: 'bg-granate-tenue text-action border-granate/5', dot: 'bg-action' },
    warn:    { card: 'border-amber-200/60 bg-surface/75 hover:border-amber-300', num: 'text-amber-700', icon: 'bg-amber-50 text-amber-600 border-amber-100/50', dot: 'bg-amber-500 animate-pulse' },
    ok:      { card: 'border-emerald-200/65 bg-surface/75 hover:border-emerald-300', num: 'text-emerald-700', icon: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', dot: '' },
  }[variant];

  return (
    <Link to={to} className="group">
      <div className={cn(
        'relative rounded-3xl border backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 shadow-[0_12px_28px_rgba(74,21,27,0.01)]',
        styles.card,
      )}>
        {styles.dot && (
          <span className={cn('absolute right-4 top-4 size-1.5 rounded-full', styles.dot)} />
        )}
        <div className={cn('mb-3 flex size-8.5 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 duration-300', styles.icon)}>
          <Icon className="size-3.5" />
        </div>
        <p
          className={cn('font-mono-jb text-[30px] leading-none tracking-tight font-bold', styles.num)}
        >
          {value}
        </p>
        <p className="mt-2 text-[11.5px] font-bold text-ink leading-tight">{label}</p>
        <p className="mt-0.5 truncate text-[10px] text-ink-soft/75">{sub}</p>
      </div>
    </Link>
  );
}
