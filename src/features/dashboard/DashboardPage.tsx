import { Link } from '@tanstack/react-router';
import {
  Building2, Bell, ArrowRight, ClipboardCheck,
  TrendingUp, TrendingDown, DollarSign, BarChart2, AlertTriangle,
  CheckCircle2, Clock, Inbox, ChevronRight, Zap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useCompanies } from '@/features/companies/company-hooks';
import { useAlerts } from '@/features/alerts/alert-hooks';
import { usePendingCount, usePendingEntries } from '@/features/validaciones/validaciones-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import type { MacroSnapshot } from '@/lib/types';

// ── Font injection ─────────────────────────────────────────────────────────────
const fontStyle = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');`;

// ── Hooks ──────────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function greet(name?: string | null) {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return { saludo, nombre: name?.split(' ')[0] ?? 'costista' };
}

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: companies = [] } = useCompanies();
  const { data: alerts = [] } = useAlerts();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: pendingEntries } = usePendingEntries(1);
  const { data: macro = [] } = useMacroLatest();

  const totalStructures = companies.reduce((acc, c) => acc + (c._count?.costStructures ?? 0), 0);
  const unread = alerts.filter((a) => !a.isRead).length;
  const dolarOficial = macro.find((m) => m.indicatorCode === 'USD_OFICIAL');
  const ipc = macro.find((m) => m.indicatorCode === 'IPC_NACIONAL');
  const { saludo, nombre } = greet(user?.name);

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <AppShell>
      <style>{fontStyle}</style>

      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ── Hero Header ──────────────────────────────────────────────────── */}
        <div
          className="relative mb-8 overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px',
            }}
          />
          {/* Accent blob */}
          <div
            className="absolute -right-16 -top-16 size-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #c0392b 0%, transparent 70%)' }}
          />

          <div className="relative px-8 py-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-[13px] font-medium capitalize text-white/50">{today}</p>
                <h1
                  className="text-[32px] leading-tight text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {saludo},{' '}
                  <span className="italic" style={{ color: '#e8a598' }}>{nombre}</span>
                </h1>
              </div>

              {/* Inline mini-stats */}
              <div className="hidden items-center gap-6 sm:flex">
                <MiniStat
                  label="Clientes"
                  value={companies.length}
                  sub={`${totalStructures} estr.`}
                />
                <div className="h-8 w-px bg-white/10" />
                <MiniStat
                  label="Pendientes"
                  value={pendingCount}
                  alert={pendingCount > 0}
                />
                <div className="h-8 w-px bg-white/10" />
                <MiniStat
                  label="Alertas"
                  value={unread}
                  alert={unread > 0}
                />
                {dolarOficial && (
                  <>
                    <div className="h-8 w-px bg-white/10" />
                    <MiniStat
                      label="USD oficial"
                      value={fmtARS(Number(dolarOficial.value))}
                      isString
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Urgent banner: pendientes ────────────────────────────────────── */}
        {pendingCount > 0 && (
          <Link to="/validaciones">
            <div
              className="mb-6 flex items-center justify-between rounded-xl px-5 py-3.5 transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #c0392b 0%, #e74c3c 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-white/20">
                  <Zap className="size-3.5 text-white" />
                </div>
                <p className="text-[13px] font-semibold text-white">
                  {pendingCount} documento{pendingCount !== 1 ? 's' : ''} esperando tu validación
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/80">
                Revisar ahora <ChevronRight className="size-3.5" />
              </div>
            </div>
          </Link>
        )}

        {/* ── Main grid ────────────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* Left column */}
          <div className="space-y-6">

            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KPICard
                icon={Building2}
                label="Clientes activos"
                value={companies.length}
                sub={totalStructures > 0 ? `${totalStructures} estructuras` : 'Sin estructuras'}
                to="/companies"
                color="blue"
              />
              <KPICard
                icon={ClipboardCheck}
                label="Por validar"
                value={pendingCount}
                sub={pendingCount > 0 ? 'Requieren acción' : 'Al día'}
                to="/validaciones"
                color={pendingCount > 0 ? 'red' : 'green'}
                urgent={pendingCount > 0}
              />
              <KPICard
                icon={Bell}
                label="Alertas"
                value={unread}
                sub={unread > 0 ? 'Sin leer' : 'Sin alertas'}
                to="/alerts"
                color={unread > 0 ? 'amber' : 'green'}
                urgent={unread > 0}
              />
              <KPICard
                icon={BarChart2}
                label="Rubros activos"
                value={new Set(companies.map((c) => c.industry).filter(Boolean)).size}
                sub="Industrias distintas"
                to="/companies"
                color="purple"
              />
            </div>

            {/* Portfolio table */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Cartera de clientes
                </h2>
                <Link to="/companies">
                  <button className="flex items-center gap-1 text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
                    Ver todos <ArrowRight className="size-3" />
                  </button>
                </Link>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                {companies.length === 0 ? (
                  <EmptyPortfolio />
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          Empresa
                        </th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          Rubro
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          Estructuras
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {companies.slice(0, 7).map((c, i) => {
                        const structs = c._count?.costStructures ?? 0;
                        return (
                          <tr
                            key={c.id}
                            className="group hover:bg-gray-50/60 transition-colors"
                          >
                            <td className="px-5 py-3">
                              <Link
                                to="/companies/$id"
                                params={{ id: c.id }}
                                className="flex items-center gap-3"
                              >
                                <span
                                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                                  style={{ background: PALETTE[i % PALETTE.length] }}
                                >
                                  {c.name.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="font-semibold text-gray-800 group-hover:text-gray-900">
                                  {c.name}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {c.industry ?? <span className="italic text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={cn(
                                'tabular-nums font-semibold',
                                structs > 0 ? 'text-gray-800' : 'text-gray-300',
                              )}>
                                {structs}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {structs > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="size-3" /> Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-400">
                                  <Clock className="size-3" /> Pendiente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pending breakdown (if any) */}
            {pendingCount > 0 && pendingEntries?.items && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Documentos por revisar
                  </h2>
                  <Link to="/validaciones">
                    <button className="flex items-center gap-1 text-[12px] font-medium text-red-500 hover:text-red-700 transition-colors">
                      Revisar todo <ArrowRight className="size-3" />
                    </button>
                  </Link>
                </div>
                <div className="overflow-hidden rounded-xl border border-red-100 bg-white">
                  {(() => {
                    const byCompany = pendingEntries.items.reduce<
                      Map<string, { name: string; count: number; items: typeof pendingEntries.items }>
                    >((map, entry) => {
                      const { id, name } = entry.connection.company;
                      if (!map.has(id)) map.set(id, { name, count: 0, items: [] });
                      const g = map.get(id)!;
                      g.count++;
                      g.items.push(entry);
                      return map;
                    }, new Map());

                    return (
                      <ul className="divide-y divide-red-50">
                        {[...byCompany.entries()].map(([cid, { name, count, items }]) => (
                          <li key={cid}>
                            <Link
                              to="/validaciones"
                              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-red-50/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                                  <Inbox className="size-3.5 text-red-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-gray-800 truncate">{name}</p>
                                  <p className="text-[11px] text-gray-400 truncate">
                                    {items.slice(0, 2).map((e) => e.fileName ?? e.rawContent.slice(0, 25)).join(' · ')}
                                    {count > 2 ? ` · +${count - 2} más` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[12px] font-bold text-white">
                                  {count}
                                </span>
                                <ChevronRight className="size-4 text-gray-300" />
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Macro panel */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Variables económicas
                </h2>
                <Link to="/macro">
                  <button className="flex items-center gap-1 text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
                    Ver más <ArrowRight className="size-3" />
                  </button>
                </Link>
              </div>

              <div className="space-y-3">
                {dolarOficial ? (
                  <MacroTile
                    label="Dólar oficial"
                    value={fmtARS(Number(dolarOficial.value))}
                    date={dolarOficial.effectiveDate}
                    source="BCRA"
                    icon={DollarSign}
                    accentColor="#1a6ef7"
                  />
                ) : (
                  <EmptyMacroTile label="Dólar oficial" to="/macro" />
                )}

                {ipc ? (
                  <MacroTile
                    label="IPC mensual"
                    value={fmtPct(Number(ipc.value))}
                    date={ipc.effectiveDate}
                    source="INDEC"
                    icon={Number(ipc.value) >= 5 ? TrendingUp : TrendingDown}
                    accentColor={Number(ipc.value) >= 5 ? '#e74c3c' : '#27ae60'}
                    warning={Number(ipc.value) >= 5 ? 'Inflación elevada — revisá precios' : undefined}
                  />
                ) : (
                  <EmptyMacroTile label="IPC mensual" to="/macro" />
                )}
              </div>
            </div>

            {/* Alerts panel */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Alertas recientes
                </h2>
                {unread > 0 && (
                  <Link to="/alerts">
                    <button className="flex items-center gap-1 text-[12px] font-medium text-amber-500 hover:text-amber-700 transition-colors">
                      Ver todas <ArrowRight className="size-3" />
                    </button>
                  </Link>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                {unread === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-700">Sin alertas pendientes</p>
                    <p className="mt-0.5 text-[12px] text-gray-400">Todos los márgenes están en orden</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {alerts.filter((a) => !a.isRead).slice(0, 4).map((a) => (
                      <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <AlertTriangle className="size-3 text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] leading-snug text-gray-700">{a.message}</p>
                          <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Accesos rápidos
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Nuevo cliente', to: '/companies', icon: Building2 },
                  { label: 'Validaciones', to: '/validaciones', icon: ClipboardCheck },
                  { label: 'Variables macro', to: '/macro', icon: TrendingUp },
                  { label: 'Alertas', to: '/alerts', icon: Bell },
                ].map(({ label, to, icon: Icon }) => (
                  <Link key={to} to={to}>
                    <button className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-3 text-[12px] font-semibold text-gray-600 transition-all hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm">
                      <Icon className="size-3.5 text-gray-400" />
                      {label}
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Palette for company avatars ────────────────────────────────────────────────
const PALETTE = [
  '#1a6ef7', '#e74c3c', '#27ae60', '#8e44ad',
  '#f39c12', '#16a085', '#2c3e50', '#c0392b',
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function MiniStat({
  label, value, sub, alert, isString,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  isString?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">{label}</p>
      <p className={cn(
        'text-[22px] font-bold tabular-nums leading-none',
        isString ? 'text-[16px] mt-0.5' : '',
        alert ? 'text-red-400' : 'text-white',
      )}
        style={isString ? { fontFamily: "'Plus Jakarta Sans', sans-serif" } : { fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-white/30">{sub}</p>}
    </div>
  );
}

function KPICard({
  icon: Icon, label, value, sub, to, color, urgent,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  sub: string;
  to: string;
  color: 'blue' | 'red' | 'green' | 'amber' | 'purple';
  urgent?: boolean;
}) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'bg-blue-100 text-blue-600',   bar: '#1a6ef7' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'bg-red-100 text-red-600',     bar: '#e74c3c' },
    green:  { bg: 'bg-emerald-50',text: 'text-emerald-700',icon: 'bg-emerald-100 text-emerald-600', bar: '#27ae60' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'bg-amber-100 text-amber-600', bar: '#f59e0b' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'bg-purple-100 text-purple-600', bar: '#8e44ad' },
  }[color];

  return (
    <Link to={to}>
      <div className={cn(
        'relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
        urgent && 'ring-1 ring-red-200',
      )}>
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl"
          style={{ background: colors.bar }}
        />
        <div className={cn('mb-3 flex size-8 items-center justify-center rounded-lg', colors.icon)}>
          <Icon className="size-4" />
        </div>
        <p
          className={cn('text-[28px] font-bold leading-none tabular-nums', colors.text)}
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {value}
        </p>
        <p className="mt-1.5 text-[12px] font-semibold text-gray-700">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-gray-400">{sub}</p>
      </div>
    </Link>
  );
}

function MacroTile({
  label, value, date, source, icon: Icon, accentColor, warning,
}: {
  label: string;
  value: string;
  date: string;
  source: string;
  icon: typeof DollarSign;
  accentColor: string;
  warning?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex size-8 items-center justify-center rounded-lg"
            style={{ background: `${accentColor}18` }}
          >
            <Icon className="size-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400">{label}</p>
            <p
              className="text-[20px] font-bold leading-none tabular-nums"
              style={{ color: accentColor, fontFamily: "'Instrument Serif', serif" }}
            >
              {value}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: accentColor }}
          >
            {source}
          </span>
          <p className="mt-1 text-[11px] text-gray-400">
            {new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
      {warning && (
        <div className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-2">
          <AlertTriangle className="size-3 shrink-0 text-red-500" />
          <p className="text-[11px] font-medium text-red-700">{warning}</p>
        </div>
      )}
    </div>
  );
}

function EmptyMacroTile({ label, to }: { label: string; to: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3.5">
      <p className="text-[12px] font-semibold text-gray-400">{label}</p>
      <Link to={to} className="mt-0.5 block text-[11px] font-medium text-blue-500 hover:text-blue-700">
        Sincronizar datos →
      </Link>
    </div>
  );
}

function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-100">
        <Building2 className="size-6 text-gray-400" />
      </div>
      <p className="text-[14px] font-semibold text-gray-700">Sin clientes cargados</p>
      <p className="mt-1 text-[12px] text-gray-400">Agregá tu primer cliente para empezar</p>
      <Link to="/companies" className="mt-4">
        <Button size="sm">Agregar cliente</Button>
      </Link>
    </div>
  );
}
