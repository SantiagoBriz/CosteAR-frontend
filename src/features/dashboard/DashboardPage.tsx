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
  'Agropecuaria':     'bg-amber-50 text-amber-700 border-amber-200/50',
  'Manufactura':      'bg-granate-tenue text-granate border-granate/10',
  'Transporte':       'bg-indigo-50 text-indigo-700 border-indigo-200/50',
  'Construcción':     'bg-orange-50 text-orange-700 border-orange-200/50',
  'Comercio':         'bg-sky-50 text-sky-700 border-sky-200/50',
  'Servicios':        'bg-zinc-100 text-zinc-700 border-zinc-200/60',
  'Logística':        'bg-emerald-50 text-emerald-700 border-emerald-200/50',
  'Gastronomía':      'bg-rose-50 text-rose-700 border-rose-200/50',
  'Salud':            'bg-teal-50 text-teal-700 border-teal-200/50',
  'Tecnología':       'bg-violet-50 text-violet-700 border-violet-200/50',
};

function industryChip(industry: string | null | undefined): string {
  if (!industry) return 'bg-zinc-50 text-zinc-400 border-zinc-100';
  for (const [key, classes] of Object.entries(INDUSTRY_CLASSES)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return classes;
  }
  return 'bg-zinc-100 text-zinc-700 border-zinc-200/60';
}

function companyHealth(structCount: number): { label: string; color: string; dot: string } {
  if (structCount === 0) return { label: 'Sin datos',  color: 'text-zinc-400',   dot: 'bg-zinc-300' };
  if (structCount <= 1)  return { label: 'Inicial',    color: 'text-zinc-500',  dot: 'bg-zinc-400' };
  if (structCount <= 3)  return { label: 'En progreso',color: 'text-granate',   dot: 'bg-action-soft animate-pulse' };
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
    <AppShell wide>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
        .font-mono-jb {
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>


      {/* ── CONTENT WRAPPER ── */}
      <div className="relative font-outfit pb-16 z-10 space-y-7">

        {/* ── BENTO HEADER SECTION (Bienvenida + Accesos) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Bento 1: Welcome & Indicators (Col: 8) */}
          <div className="lg:col-span-8 rounded-[28px] border border-line bg-white p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(74,21,27,0.015)] hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300 group">

            {/* Decorative corner glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-action/10 blur-3xl" />

            <div className="space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-granate/15 bg-granate-tenue px-3.5 py-1 text-[11px] font-bold text-granate tracking-wide">
                <ShieldCheck className="size-3.5" /> {today}
              </span>
              <h1 className="text-[34px] font-extrabold leading-[1.1] text-granate-deep tracking-tight pt-1">
                {greet(user?.name)}
              </h1>
              <p className="text-[13px] leading-relaxed text-ink-soft max-w-xl">
                Revisá la evolución de los costos país y gestioná las auditorías y desvíos de tu cartera de clientes PyME desde tu centro operativo.
              </p>
            </div>

            {/* Economic indicators strip */}
            <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-line/60 relative z-10">
              {dolarOficial && (
                <div className="flex items-center gap-3 rounded-2xl bg-white border border-line px-5 py-3 shadow-sm hover:border-granate/15 transition-colors duration-300">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-granate-tenue text-granate">
                    <DollarSign className="size-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">Dólar Oficial</p>
                    <p className="font-mono-jb text-[15.5px] font-bold text-ink leading-none mt-1">
                      {fmtARS(Number(dolarOficial.value))}
                    </p>
                  </div>
                </div>
              )}
              {ipc && (
                <div className="flex items-center gap-3 rounded-2xl bg-white border border-line px-5 py-3 shadow-sm hover:border-granate/15 transition-colors duration-300">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-granate-tenue text-granate">
                    <Percent className="size-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">IPC Mensual</p>
                    <p className="font-mono-jb text-[15.5px] font-bold text-ink leading-none mt-1">
                      {Number(ipc.value) > 0 ? '+' : ''}{Number(ipc.value).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bento 2: Quick Actions Grid (Col: 4) */}
          <div className="lg:col-span-4 rounded-[28px] border border-line bg-white p-6 flex flex-col justify-between shadow-[0_10px_30px_rgba(74,21,27,0.015)] hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300">
            <h2 className="text-[13px] font-extrabold text-granate-deep uppercase tracking-wider mb-4 px-1.5">
              Accesos Rápidos
            </h2>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <Link to="/companies" className="flex flex-col justify-between rounded-2xl bg-white border border-line p-4 hover:border-granate/20 hover:-translate-y-0.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)] group">
                <div className="size-8 rounded-xl bg-granate-tenue text-granate flex items-center justify-center border border-granate/5 group-hover:scale-105 transition-transform duration-300">
                  <Building2 className="size-4" />
                </div>
                <div className="mt-3">
                  <p className="text-[12px] font-bold text-ink leading-tight">Clientes</p>
                  <p className="text-[9.5px] text-ink-soft mt-0.5 font-medium">Alta PyME</p>
                </div>
              </Link>
              <Link to="/validaciones" className="flex flex-col justify-between rounded-2xl bg-white border border-line p-4 hover:border-granate/20 hover:-translate-y-0.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)] group">
                <div className="size-8 rounded-xl bg-granate-tenue text-granate flex items-center justify-center border border-granate/5 group-hover:scale-105 transition-transform duration-300">
                  <ClipboardCheck className="size-4" />
                </div>
                <div className="mt-3">
                  <p className="text-[12px] font-bold text-ink leading-tight">Validar</p>
                  <p className="text-[9.5px] text-ink-soft mt-0.5 font-medium">{pendingCount} tareas</p>
                </div>
              </Link>
              <Link to="/alerts" className="flex flex-col justify-between rounded-2xl bg-white border border-line p-4 hover:border-granate/20 hover:-translate-y-0.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)] group">
                <div className="size-8 rounded-xl bg-granate-tenue text-granate flex items-center justify-center border border-granate/5 group-hover:scale-105 transition-transform duration-300">
                  <Bell className="size-4" />
                </div>
                <div className="mt-3">
                  <p className="text-[12px] font-bold text-ink leading-tight">Alertas</p>
                  <p className="text-[9.5px] text-ink-soft mt-0.5 font-medium">{unread} críticas</p>
                </div>
              </Link>
              <Link to="/profile" className="flex flex-col justify-between rounded-2xl bg-white border border-line p-4 hover:border-granate/20 hover:-translate-y-0.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)] group">
                <div className="size-8 rounded-xl bg-granate-tenue text-granate flex items-center justify-center border border-granate/5 group-hover:scale-105 transition-transform duration-300">
                  <User className="size-4" />
                </div>
                <div className="mt-3">
                  <p className="text-[12px] font-bold text-ink leading-tight">Mi Perfil</p>
                  <p className="text-[9.5px] text-ink-soft mt-0.5 font-medium">Cuenta</p>
                </div>
              </Link>
            </div>
          </div>

        </div>

        {/* ── STAT CARDS ROW (Bento KPIs) ── */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
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
            sub={pendingCount > 0 ? 'Auditoría pendiente' : 'Al día'}
            icon={ClipboardCheck}
            to="/validaciones"
            variant={pendingCount > 0 ? 'urgent' : 'ok'}
          />
          <StatCard
            label="Alertas Activas"
            value={unread}
            sub={unread > 0 ? `${unread} desvíos críticos` : 'Sin alertas'}
            icon={Bell}
            to="/alerts"
            variant={unread > 0 ? 'warn' : 'ok'}
          />
          <StatCard
            label="Estructuras Totales"
            value={totalStructures}
            sub="Modelos calibrados"
            icon={Activity}
            to="/companies"
            variant="neutral"
          />
        </div>

        {/* ── MIDDLE ANALYTICAL ROW (Attention Feed) ──
             Acá vivía "Variación de Costos País": un gráfico con datos INVENTADOS
             (un índice Ene→Jun fijo en el código, y un "+20.4%" escrito a mano).
             No salía de los períodos del costista ni del INDEC: no era un número,
             era un dibujo. En una herramienta que fija precios reales, un número
             que no se puede rastrear hasta su origen es peor que no tener número.
             Se saca hasta que exista el dato de verdad (problema B — ver
             DECISIONES.md del backend: el insumo es la comparación entre períodos,
             que ya está construida y testeada). */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Bento 4: Prioritized Feed (Alerts & Warnings) (Col: 12) */}
          <div className="lg:col-span-12 rounded-[28px] border border-line bg-white p-6 flex flex-col justify-between shadow-sm hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4.5 px-1">
                <h2 className="text-[13px] font-extrabold text-granate-deep uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="size-4 text-granate" /> Centro de Alertas
                </h2>
                <Link to="/alerts" className="text-[10.5px] font-bold text-granate hover:text-action transition-colors">
                  Ver todas →
                </Link>
              </div>
              
              {unread === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mb-3.5 shadow-sm">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="text-[13px] font-bold text-ink">Sin desvíos de costos</p>
                  <p className="text-[10.5px] text-ink-soft/75 mt-1">Todos los indicadores están estables.</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {alerts.filter((a) => !a.isRead).slice(0, 4).map((a) => (
                    <li key={a.id} className="p-3.5 bg-white border border-line rounded-2xl flex items-start gap-3 hover:border-granate/10 transition-all duration-200 shadow-[0_2px_8px_rgba(74,21,27,0.005)]">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11.5px] leading-relaxed text-ink font-bold line-clamp-2">{a.message}</p>
                        <p className="text-[9.5px] text-ink-soft/80 mt-1 font-semibold">{formatDate(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Requiere Atención alert indicator */}
            {attention.some((a) => a.needsAttention) && (
              <Link to="/validaciones" className="mt-4 p-3.5 rounded-2xl bg-action/5 border border-action/10 flex items-center justify-between hover:bg-action/10 hover:border-action/20 transition-all group">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-action opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-action"></span>
                  </span>
                  <span className="text-[11px] font-bold text-action">Revisar PyMEs con discrepancias</span>
                </div>
                <ChevronRight className="size-4 text-action group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>

        </div>

        {/* ── BOTTOM STRUCTURAL ROW (Portfolio Monitor + Pending Validations) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Bento 5: Cartera de Clientes (Col: 7) */}
          <div className="lg:col-span-7 rounded-[28px] border border-line bg-white shadow-sm hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-line bg-zinc-50/15">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[14px] font-extrabold text-granate-deep uppercase tracking-wider">
                    Monitoreo de Cartera
                  </h2>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    {companies.length} cliente{companies.length !== 1 ? 's' : ''} registrado{companies.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 focus-within:border-granate/30 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]">
                    <Search className="size-3.5 text-zinc-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-28 bg-transparent text-[11px] text-ink placeholder-zinc-400 outline-none"
                    />
                  </div>
                  <Link to="/companies">
                    <Button variant="secondary" size="sm" className="rounded-full text-[10.5px] font-bold px-3.5 py-2 shadow-sm bg-white hover:bg-zinc-50">
                      Ver Todos <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-6 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white border border-line text-granate shadow-sm">
                  <Building2 className="size-6" />
                </div>
                <p className="text-[13px] font-bold text-ink">Sin clientes activos</p>
                <p className="mt-1 text-[11px] text-ink-soft max-w-xs">Agregá tu primer cliente para comenzar a procesar costos.</p>
                <Link to="/companies" className="mt-4">
                  <Button size="sm" className="rounded-full bg-granate hover:bg-granate-deep text-white font-bold py-2 px-4 text-xs shadow-md">
                    Agregar Cliente
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="lg:min-w-[500px]">
                  {/* Header (desktop column labels only — mobile uses stacked cards) */}
                  <div className="hidden lg:grid lg:grid-cols-[1fr_120px_70px_90px] gap-x-4 px-6 py-3 text-[9.5px] font-bold uppercase tracking-wider text-ink-soft bg-zinc-50/20 border-b border-line">
                    <span>Empresa</span>
                    <span>Sector</span>
                    <span className="text-center">Modelos</span>
                    <span className="text-right">Salud</span>
                  </div>

                  {filteredCompanies.length === 0 && search ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <p className="text-[12px] text-ink-soft">Sin resultados para <strong>"{search}"</strong></p>
                        <button onClick={() => setSearch('')} className="mt-2 text-[11px] text-action font-bold hover:underline">
                          Limpiar filtros
                        </button>
                      </div>
                  ) : (
                    <ul className="divide-y divide-line">
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
                              className="flex flex-col items-start gap-3 px-6 py-4 hover:bg-zinc-50/15 transition-colors group lg:grid lg:grid-cols-[1fr_120px_70px_90px] lg:items-center lg:gap-x-4 lg:gap-y-0"
                            >
                              {/* Empresa */}
                              <div className="flex items-center gap-3.5 min-w-0 w-full">
                                <span
                                  className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold border shadow-sm group-hover:scale-105 transition-transform duration-350", avColorClass)}
                                >
                                  {c.name[0]?.toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-[13px] font-bold text-ink group-hover:text-granate transition-colors leading-snug">{c.name}</p>
                                    {pending && (
                                      <span className="rounded bg-action-soft/10 text-action-soft px-1.5 py-0.2 text-[8.5px] font-bold tracking-wide border border-action-soft/15">
                                        {pending.count} pend.
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9.5px] text-ink-soft/70 font-mono-jb leading-tight mt-0.5">
                                    {c.cuit ? `CUIT: ${c.cuit}` : 'Sin CUIT'}
                                  </p>
                                </div>
                              </div>

                              {/* Mobile/tablet: sector + modelos + salud as a stacked meta row (hidden from lg, where the dedicated columns below take over) */}
                              <div className="flex flex-wrap items-center gap-2 pl-12 lg:hidden">
                                <span
                                  className={cn("inline-block truncate rounded-full px-2.5 py-0.5 text-[8.5px] font-bold border text-center whitespace-nowrap shadow-sm", chipBg)}
                                >
                                  {c.industry ?? 'General'}
                                </span>
                                <span className={cn(
                                  'font-mono-jb text-[10.5px] font-bold',
                                  structs > 0 ? 'text-ink' : 'text-zinc-400',
                                )}>
                                  {structs} modelo{structs !== 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1.5 font-bold">
                                  <span className={cn('size-1.5 rounded-full flex-shrink-0', health.dot)} />
                                  <span className={cn('text-[9px] font-bold uppercase tracking-wider', health.color)}>
                                    {health.label}
                                  </span>
                                </span>
                              </div>

                              {/* Sector (desktop column) */}
                              <span
                                className={cn("hidden lg:inline-block truncate rounded-full px-2.5 py-0.5 text-[8.5px] font-bold border text-center whitespace-nowrap self-center justify-self-start shadow-sm", chipBg)}
                              >
                                {c.industry ?? 'General'}
                              </span>

                              {/* Estructuras (desktop column) */}
                              <span className={cn(
                                'hidden lg:block text-center font-mono-jb text-[12.5px] font-bold self-center',
                                structs > 0 ? 'text-ink' : 'text-zinc-400',
                              )}>
                                {structs}
                              </span>

                              {/* Salud (desktop column) */}
                              <div className="hidden lg:flex items-center gap-1.5 justify-end self-center font-bold">
                                <span className={cn('size-1.5 rounded-full flex-shrink-0', health.dot)} />
                                <span className={cn('text-[9px] font-bold uppercase tracking-wider', health.color)}>
                                  {health.label}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bento 6: Tareas / Aprobaciones Pendientes (Col: 5) */}
          <div className="lg:col-span-5 rounded-[28px] border border-line bg-white shadow-sm hover:shadow-[0_20px_50px_rgba(74,21,27,0.04)] hover:border-granate/20 transition-all duration-300 overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="px-6 py-5 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-granate text-[11px] font-extrabold text-white shadow-sm">
                    {pendingCount}
                  </span>
                  <div>
                    <h2 className="text-[14px] font-extrabold text-granate-deep uppercase tracking-wider">
                      Validación de Insumos
                    </h2>
                    <p className="text-[10.5px] text-ink-soft mt-0.5">Auditoría de comprobantes y remitos</p>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Link to="/validaciones">
                    <Button size="sm" className="rounded-full bg-granate hover:bg-granate-deep text-white font-bold py-1.5 px-3.5 text-[10px] shadow-sm">
                      Auditar <ChevronRight className="size-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>

              {pendingCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm mb-4">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="text-[13px] font-bold text-ink">¡Al día!</p>
                  <p className="text-[11px] text-ink-soft/75 max-w-xs mt-1">
                    No tenés comprobantes o insumos pendientes de auditoría regulatoria.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {[...pendingByCompany.entries()].slice(0, 4).map(([cid, { name, count, fileNames }]) => (
                    <li key={cid}>
                      <Link
                        to="/validaciones"
                        className="flex items-center gap-4 px-6 py-4.5 hover:bg-zinc-50/15 transition-colors group"
                      >
                        <span className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-granate-tenue text-[11px] font-bold text-granate border border-granate/10 shadow-sm">
                          {name[0]?.toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold text-ink group-hover:text-granate transition-colors leading-snug">{name}</p>
                          <p className="truncate text-[10.5px] text-ink-soft/70 mt-0.5">
                            {fileNames.slice(0, 2).join(' · ')}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-granate-tenue border border-granate/10 shadow-sm px-2.5 py-0.5 text-[10.5px] font-bold text-granate">
                          {count} doc{count !== 1 ? 's' : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Documentos Recientes Feed */}
            {recentDocs.length > 0 && (
              <div className="p-4.5 bg-zinc-50/10 border-t border-line">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80 mb-3 px-1.5">
                  Últimas Extracciones IA
                </h3>
                <div className="space-y-2">
                  {recentDocs.slice(0, 2).map((doc) => {
                    const SrcIcon = SOURCE_ICON[doc.sourceType] ?? FileText;
                    const audit = doc.classificationAudits[0];
                    return (
                      <div key={doc.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-white border border-line rounded-2xl shadow-[0_2px_8px_rgba(74,21,27,0.005)]">
                        <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-line text-zinc-400">
                          <SrcIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold text-ink leading-tight">
                            {doc.connection.company.name}
                          </p>
                          <p className="truncate text-[9.5px] text-ink-soft/85 mt-0.5">
                            {audit?.documentType ?? 'Comprobante'} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 className="size-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Connection security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-soft/70 pt-4">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <span>Entorno académico auditado · Conexión segura CosteAR</span>
        </div>

      </div>

      <CostitaChat companies={companies} />
    </AppShell>
  );
}

// ── Stat Card Component (Rediseñado con Glassmorphism)
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
    neutral: { card: 'border-line bg-white/90 hover:border-granate/20', num: 'text-granate-deep', icon: 'bg-zinc-50 text-zinc-500 border-zinc-200/50', dot: '' },
    urgent:  { card: 'border-red-200 bg-white/90 hover:border-red-400', num: 'text-action', icon: 'bg-red-50 text-action border-red-100', dot: 'bg-action animate-pulse' },
    warn:    { card: 'border-amber-200 bg-white/90 hover:border-amber-400', num: 'text-amber-700', icon: 'bg-amber-50 text-amber-600 border-amber-100/50', dot: 'bg-amber-500 animate-pulse' },
    ok:      { card: 'border-emerald-250 bg-white/90 hover:border-emerald-400', num: 'text-emerald-700', icon: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', dot: '' },
  }[variant];

  return (
    <Link to={to} className="group">
      <div className={cn(
        'relative rounded-[28px] border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 shadow-[0_8px_24px_rgba(74,21,27,0.01)]',
        styles.card,
      )}>
        {styles.dot && (
          <span className={cn('absolute right-4.5 top-4.5 size-1.5 rounded-full', styles.dot)} />
        )}
        <div className={cn('mb-3.5 flex size-9 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.015)]', styles.icon)}>
          <Icon className="size-4.5" />
        </div>
        <p
          className={cn('font-mono-jb text-[32px] leading-none tracking-tight font-bold', styles.num)}
        >
          {value}
        </p>
        <p className="mt-2 text-[12.5px] font-bold text-ink leading-tight">{label}</p>
        <p className="mt-0.5 truncate text-[10.5px] text-ink-soft/75 font-semibold">{sub}</p>
      </div>
    </Link>
  );
}

