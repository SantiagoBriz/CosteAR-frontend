import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CostitaChat } from './CostitaChat';
import {
  Building2, Bell, ArrowRight, ClipboardCheck,
  DollarSign, AlertTriangle,
  CheckCircle2, FileText, ChevronRight, Activity,
  Percent, Search, FileInput, Image, MessageSquare, User,
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

// Colores por sector/industria
const INDUSTRY_COLORS: Record<string, [string, string]> = {
  'Agropecuaria':     ['#d1fae5', '#065f46'],
  'Manufactura':      ['#dbeafe', '#1d4ed8'],
  'Transporte':       ['#ede9fe', '#6d28d9'],
  'Construcción':     ['#fef3c7', '#92400e'],
  'Comercio':         ['#fce7f3', '#be185d'],
  'Servicios':        ['#e0f2fe', '#0369a1'],
  'Logística':        ['#ede9fe', '#6d28d9'],
  'Gastronomía':      ['#fff7ed', '#c2410c'],
  'Salud':            ['#dcfce7', '#166534'],
  'Tecnología':       ['#f0fdf4', '#15803d'],
};

function industryChip(industry: string | null | undefined): [string, string] {
  if (!industry) return ['#f3f4f6', '#6b7280'];
  // Buscar coincidencia parcial
  for (const [key, colors] of Object.entries(INDUSTRY_COLORS)) {
    if (industry.toLowerCase().includes(key.toLowerCase())) return colors;
  }
  // fallback determinístico
  const palette: [string, string][] = Object.values(INDUSTRY_COLORS);
  return palette[(industry.charCodeAt(0) ?? 0) % palette.length]!;
}

// Health indicator por empresa (proxy: cantidad de estructuras)
function companyHealth(structCount: number): { label: string; color: string; dot: string } {
  if (structCount === 0) return { label: 'Sin datos',  color: 'text-gray-400',   dot: 'bg-gray-300' };
  if (structCount <= 1)  return { label: 'Inicial',    color: 'text-amber-600',  dot: 'bg-amber-400' };
  if (structCount <= 3)  return { label: 'En progreso',color: 'text-blue-600',   dot: 'bg-blue-400' };
  return                         { label: 'Activo',    color: 'text-emerald-600',dot: 'bg-emerald-500' };
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
  if (h < 12) return `Buenos días, ${name?.split(' ')[0] ?? 'costista'}`;
  if (h < 19) return `Buenas tardes, ${name?.split(' ')[0] ?? 'costista'}`;
  return `Buenas noches, ${name?.split(' ')[0] ?? 'costista'}`;
}

// Avatar color determinístico por nombre
function avatarColor(name: string) {
  const colors = [
    ['#dbeafe','#1d4ed8'], ['#fce7f3','#be185d'], ['#d1fae5','#065f46'],
    ['#ede9fe','#6d28d9'], ['#fff7ed','#c2410c'], ['#f0fdf4','#15803d'],
    ['#fef3c7','#92400e'], ['#e0f2fe','#0369a1'],
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

  // Pending breakdown by company
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>

      <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }} className="pb-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-1 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-medium capitalize text-gray-400">{today}</p>
            <h1
              className="mt-0.5 text-[30px] leading-tight text-gray-900"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              {greet(user?.name)}
            </h1>
          </div>
          {/* Macro strip */}
          <div className="flex items-center gap-4">
            {dolarOficial && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                <DollarSign className="size-3.5 text-blue-500" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">USD oficial</p>
                  <p className="text-[14px] font-bold tabular-nums text-blue-700">
                    {fmtARS(Number(dolarOficial.value))}
                  </p>
                </div>
              </div>
            )}
            {ipc && (
              <div className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2',
                Number(ipc.value) >= 5
                  ? 'border-red-100 bg-red-50'
                  : 'border-green-100 bg-green-50',
              )}>
                <Percent className={cn('size-3.5', Number(ipc.value) >= 5 ? 'text-red-500' : 'text-green-500')} />
                <div>
                  <p className={cn('text-[10px] font-semibold uppercase tracking-wide', Number(ipc.value) >= 5 ? 'text-red-400' : 'text-green-400')}>
                    IPC mensual
                  </p>
                  <p className={cn('text-[14px] font-bold tabular-nums', Number(ipc.value) >= 5 ? 'text-red-700' : 'text-green-700')}>
                    {Number(ipc.value) > 0 ? '+' : ''}{Number(ipc.value).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── KPIs ────────────────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Clientes activos"
            value={companies.length}
            sub={`${companiesWithStructure} con estructura`}
            icon={Building2}
            to="/companies"
            variant="neutral"
          />
          <StatCard
            label="Por validar"
            value={pendingCount}
            sub={pendingCount > 0 ? 'Requieren acción' : 'Al día ✓'}
            icon={ClipboardCheck}
            to="/validaciones"
            variant={pendingCount > 0 ? 'urgent' : 'ok'}
          />
          <StatCard
            label="Alertas activas"
            value={unread}
            sub={unread > 0 ? 'Sin revisar' : 'Sin alertas ✓'}
            icon={Bell}
            to="/alerts"
            variant={unread > 0 ? 'warn' : 'ok'}
          />
          <StatCard
            label="Estructuras totales"
            value={totalStructures}
            sub={`En ${companies.length} empresa${companies.length !== 1 ? 's' : ''}`}
            icon={Activity}
            to="/companies"
            variant="neutral"
          />
        </div>

        {/* ── Qué necesita mi atención hoy (cruza todas las empresas) ───────── */}
        {attention.some((a) => a.needsAttention) && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <span className="text-[13px] font-semibold text-gray-800">Qué necesita tu atención hoy</span>
            </div>
            <div className="divide-y divide-gray-100">
              {attention.filter((a) => a.needsAttention).map((a) => (
                <Link
                  key={a.companyId}
                  to="/validaciones"
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-gray-900">{a.companyName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {a.conflicts > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                          {a.conflicts} a revisar
                        </span>
                      )}
                      {a.pending > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
                          {a.pending} pendiente{a.pending !== 1 ? 's' : ''}
                        </span>
                      )}
                      {a.daysSinceActivity != null && a.daysSinceActivity >= 14 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                          sin novedades hace {a.daysSinceActivity} días
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Urgent: pending validations ──────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-red-200 bg-white">
            <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
                <span className="text-[13px] font-semibold text-red-800">
                  Documentos esperando validación
                </span>
              </div>
              <Link to="/validaciones">
                <button className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-700 transition-colors">
                  Revisar todo <ChevronRight className="size-3.5" />
                </button>
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {[...pendingByCompany.entries()].map(([cid, { name, count, fileNames }]) => {
                const [bg, text] = avatarColor(name);
                return (
                  <li key={cid}>
                    <Link
                      to="/validaciones"
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                        style={{ background: bg, color: text }}
                      >
                        {name[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-800">{name}</p>
                        <p className="truncate text-[11px] text-gray-400">
                          {fileNames.slice(0, 2).join(' · ')}
                          {count > 2 ? ` · +${count - 2} más` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[12px] font-bold text-red-700">
                        {count} doc{count !== 1 ? 's' : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── Main 2-col grid ──────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">

          {/* Left: portfolio ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {/* Header con search */}
            <div className="border-b border-gray-100 px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-gray-800"
                    style={{ fontFamily: "'Syne', sans-serif" }}>
                    Monitoreo de cartera
                  </h2>
                  <p className="text-[12px] text-gray-400">
                    {companies.length} empresa{companies.length !== 1 ? 's' : ''}
                    {search ? ` · ${filteredCompanies.length} resultado${filteredCompanies.length !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 focus-within:border-gray-400 focus-within:bg-white transition-all">
                    <Search className="size-3.5 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar empresa..."
                      className="w-32 bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <Link to="/companies">
                    <Button variant="ghost" size="sm">
                      Ver todas <ArrowRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {companies.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Building2 className="size-7 text-gray-400" />
                </div>
                <p className="text-[14px] font-semibold text-gray-700">Sin clientes todavía</p>
                <p className="mt-1 text-[12px] text-gray-400">Agregá tu primer cliente para empezar a costear</p>
                <Link to="/companies" className="mt-4">
                  <Button size="sm">Agregar cliente</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-gray-100 bg-gray-50 px-5 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Empresa</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sector</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Estr.</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Salud</span>
                </div>

                {filteredCompanies.length === 0 && search ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <p className="text-[13px] text-gray-500">Sin resultados para <strong>"{search}"</strong></p>
                    <button onClick={() => setSearch('')} className="mt-2 text-[12px] text-blue-500 hover:underline">
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {filteredCompanies.map((c) => {
                      const structs = c._count?.costStructures ?? 0;
                      const [avBg, avText] = avatarColor(c.name);
                      const [chipBg, chipText] = industryChip(c.industry);
                      const health = companyHealth(structs);
                      const pending = pendingByCompany.get(c.id);
                      return (
                        <li key={c.id}>
                          <Link
                            to="/companies/$id"
                            params={{ id: c.id }}
                            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                          >
                            {/* Empresa */}
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                                style={{ background: avBg, color: avText }}
                              >
                                {c.name[0]?.toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-gray-800">{c.name}</p>
                                {pending && (
                                  <p className="text-[11px] font-medium text-red-500">
                                    {pending.count} pendiente{pending.count !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Sector chip */}
                            <span
                              className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
                              style={{ background: chipBg, color: chipText }}
                            >
                              {c.industry ?? '—'}
                            </span>

                            {/* Estructuras */}
                            <span className={cn(
                              'text-center text-[13px] font-bold tabular-nums',
                              structs > 0 ? 'text-gray-800' : 'text-gray-300',
                            )}>
                              {structs}
                            </span>

                            {/* Salud */}
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className={cn('size-2 rounded-full flex-shrink-0', health.dot)} />
                              <span className={cn('text-[11px] font-semibold whitespace-nowrap', health.color)}>
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

          {/* Right: sidebar ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Alerts */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h2 className="text-[14px] font-semibold text-gray-800"
                  style={{ fontFamily: "'Syne', sans-serif" }}>
                  Alertas
                  {unread > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </h2>
                {unread > 0 && (
                  <Link to="/alerts">
                    <button className="text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
                      Ver todas →
                    </button>
                  </Link>
                )}
              </div>
              {unread === 0 ? (
                <div className="flex items-center gap-3 px-5 py-4">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <p className="text-[13px] text-gray-500">Sin alertas pendientes</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {alerts.filter((a) => !a.isRead).slice(0, 3).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-[12px] leading-snug text-gray-700">{a.message}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Documentos recientes */}
            {recentDocs.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                  <h2 className="text-[14px] font-semibold text-gray-800"
                    style={{ fontFamily: "'Syne', sans-serif" }}>
                    Documentos recientes
                  </h2>
                  <Link to="/automatizacion">
                    <button className="text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
                      Ver todo →
                    </button>
                  </Link>
                </div>
                <ul className="divide-y divide-gray-50">
                  {recentDocs.map((doc) => {
                    const SrcIcon = SOURCE_ICON[doc.sourceType] ?? FileText;
                    const audit = doc.classificationAudits[0];
                    return (
                      <li key={doc.id} className="flex items-start gap-3 px-5 py-3">
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <SrcIcon className="size-3.5 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-gray-700">
                            {doc.connection.company.name}
                          </p>
                          <p className="truncate text-[11px] text-gray-400">
                            {audit?.documentType ?? 'Documento'} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Quick actions */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h2 className="text-[14px] font-semibold text-gray-800"
                  style={{ fontFamily: "'Syne', sans-serif" }}>
                  Acciones rápidas
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5 p-4 bg-zinc-50/50">
                <Link to="/companies" className="flex flex-col gap-2 rounded-xl border border-zinc-200/60 bg-white p-3 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
                  <Building2 className="size-4.5 text-granate" />
                  <div>
                    <p className="text-[12px] font-bold text-zinc-800 leading-tight">Nuevo Cliente</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Crear empresa</p>
                  </div>
                </Link>
                <Link to="/validaciones" className="flex flex-col gap-2 rounded-xl border border-zinc-200/60 bg-white p-3 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
                  <ClipboardCheck className="size-4.5 text-granate" />
                  <div>
                    <p className="text-[12px] font-bold text-zinc-800 leading-tight">Validaciones</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{pendingCount} pendientes</p>
                  </div>
                </Link>
                <Link to="/alerts" className="flex flex-col gap-2 rounded-xl border border-zinc-200/60 bg-white p-3 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
                  <Bell className="size-4.5 text-granate" />
                  <div>
                    <p className="text-[12px] font-bold text-zinc-800 leading-tight">Alertas</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{unread} activas</p>
                  </div>
                </Link>
                <Link to="/profile" className="flex flex-col gap-2 rounded-xl border border-zinc-200/60 bg-white p-3 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
                  <User className="size-4.5 text-granate" />
                  <div>
                    <p className="text-[12px] font-bold text-zinc-800 leading-tight">Mi Perfil</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Configuración</p>
                  </div>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Costista AI Chat (floating) ─────────────────────────────────── */}
      <CostitaChat companies={companies} />
    </AppShell>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
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
    neutral: { card: 'border-gray-200', num: 'text-gray-900', icon: 'bg-gray-100 text-gray-500', dot: '' },
    urgent:  { card: 'border-red-200 bg-red-50/30', num: 'text-red-700', icon: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    warn:    { card: 'border-amber-200 bg-amber-50/30', num: 'text-amber-700', icon: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500' },
    ok:      { card: 'border-emerald-100 bg-emerald-50/20', num: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-600', dot: '' },
  }[variant];

  return (
    <Link to={to}>
      <div className={cn(
        'relative rounded-2xl border bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5',
        styles.card,
      )}>
        {styles.dot && (
          <span className={cn('absolute right-4 top-4 size-2 rounded-full', styles.dot)} />
        )}
        <div className={cn('mb-3 flex size-9 items-center justify-center rounded-xl', styles.icon)}>
          <Icon className="size-4" />
        </div>
        <p
          className={cn('text-[34px] leading-none tabular-nums', styles.num)}
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          {value}
        </p>
        <p className="mt-1.5 text-[12px] font-semibold text-gray-700">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-gray-400">{sub}</p>
      </div>
    </Link>
  );
}
