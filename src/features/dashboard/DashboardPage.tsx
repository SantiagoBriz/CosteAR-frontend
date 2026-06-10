import { Link } from '@tanstack/react-router';
import {
  Building2, Bell, ArrowRight, ClipboardCheck,
  TrendingUp, TrendingDown, DollarSign, BarChart2, AlertTriangle,
  CheckCircle2, Clock, Inbox,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCompanies } from '@/features/companies/company-hooks';
import { useAlerts } from '@/features/alerts/alert-hooks';
import { usePendingCount, usePendingEntries } from '@/features/validaciones/validaciones-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import type { MacroSnapshot } from '@/lib/types';

// ── Hooks locales ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function greet(name?: string | null) {
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${saludo}, ${name?.split(' ')[0] ?? 'costista'}`;
}

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
}

function fmtPct(n: number) {
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: companies = [] } = useCompanies();
  const { data: alerts = [] } = useAlerts();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: pendingEntries } = usePendingEntries(1);
  const { data: macro = [] } = useMacroLatest();

  const totalStructures = companies.reduce((acc, c) => acc + (c._count?.costStructures ?? 0), 0);
  const unread = alerts.filter((a) => !a.isRead).length;

  // Extraer datos macro relevantes (indicatorCode en lugar de variable)
  const dolarOficial = macro.find((m) => m.indicatorCode === 'USD_OFICIAL');
  const ipc = macro.find((m) => m.indicatorCode === 'IPC_NACIONAL');

  // Sin lastMarginPct en Company todavía — dejamos atRisk en 0 por ahora
  const atRisk: typeof companies = [];

  return (
    <AppShell>
      <PageHeader
        title={greet(user?.name)}
        description={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* Fila 1: KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={Building2}
          label="Clientes activos"
          value={companies.length}
          sub={totalStructures > 0 ? `${totalStructures} estructuras cargadas` : 'Sin estructuras aún'}
          to="/companies"
        />
        <KPICard
          icon={ClipboardCheck}
          label="Validaciones pendientes"
          value={pendingCount}
          sub={pendingCount > 0 ? 'Documentos de operadores esperando' : 'Todo al día'}
          to="/validaciones"
          alert={pendingCount > 0}
        />
        <KPICard
          icon={Bell}
          label="Alertas activas"
          value={unread}
          sub={unread > 0 ? 'Márgenes bajo el umbral' : 'Sin alertas pendientes'}
          to="/alerts"
          alert={unread > 0}
        />
        <KPICard
          icon={BarChart2}
          label="Clientes en riesgo"
          value={atRisk.length}
          sub="Calculá estructuras para ver"
          to="/companies"
          alert={atRisk.length > 0}
        />
      </div>

      {/* Fila 2: Macro + Estado de cartera */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">

        {/* Panel macro */}
        <div className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">
            Variables económicas
          </h2>

          {dolarOficial ? (
            <MacroCard
              label="Dólar oficial"
              value={fmtARS(Number(dolarOficial.value))}
              date={dolarOficial.effectiveDate}
              source="BCRA"
              icon={DollarSign}
              color="blue"
            />
          ) : (
            <EmptyMacroCard label="Dólar oficial" hint="Sincronizá BCRA para ver el tipo de cambio" to="/macro" />
          )}

          {ipc ? (
            <MacroCard
              label="IPC mensual"
              value={fmtPct(Number(ipc.value))}
              date={ipc.effectiveDate}
              source="INDEC"
              icon={Number(ipc.value) >= 5 ? TrendingUp : TrendingDown}
              color={Number(ipc.value) >= 5 ? 'red' : 'green'}
              note={Number(ipc.value) >= 5 ? 'Inflación elevada — revisá tus precios de venta' : undefined}
            />
          ) : (
            <EmptyMacroCard label="IPC mensual" hint="Sincronizá INDEC para ver inflación" to="/macro" />
          )}

          <Link
            to="/macro"
            className="flex items-center gap-1.5 text-[12px] text-granate hover:text-action"
          >
            Ver todas las variables <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Estado de la cartera */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">
              Estado de la cartera
            </h2>
            <Link to="/companies">
              <Button variant="ghost" size="sm">
                Ver clientes <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          <Card>
            <CardBody className="p-0">
              {companies.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Building2 className="mb-3 size-8 text-idle" />
                  <p className="text-sm font-medium text-ink">No tenés clientes cargados</p>
                  <p className="mt-1 text-[13px] text-ink-soft">Agregá tu primer cliente para empezar a costear</p>
                  <Link to="/companies" className="mt-4">
                    <Button size="sm">Agregar cliente</Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {companies.slice(0, 6).map((c) => {
                    const margin: number | null = null;
                    const threshold = 15;
                    const status = margin == null ? 'none'
                      : margin < 0 ? 'loss'
                      : margin < threshold ? 'warn'
                      : 'ok';

                    return (
                      <li key={c.id}>
                        <Link
                          to="/companies/$id"
                          params={{ id: c.id }}
                          className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-alt/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                              status === 'ok'   ? 'bg-green-100 text-green-700' :
                              status === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                              status === 'loss' ? 'bg-red-100 text-red-700' :
                              'bg-surface-alt text-ink-soft',
                            )}>
                              {c.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-medium text-ink">{c.name}</p>
                              <p className="text-[12px] text-ink-soft">{c.industry ?? 'Sin rubro'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {margin != null ? (
                              <div className="text-right">
                                <p className={cn(
                                  'text-[15px] font-bold tabular-nums',
                                  status === 'ok' ? 'text-green-600' :
                                  status === 'warn' ? 'text-yellow-600' : 'text-red-600',
                                )}>
                                  {(margin as number).toFixed(1)}%
                                </p>
                                <p className="text-[11px] text-ink-soft">margen</p>
                              </div>
                            ) : (
                              <span className="text-[12px] text-ink-soft italic">Sin cálculo</span>
                            )}
                            {status === 'loss' && <AlertTriangle className="size-4 text-red-500" />}
                            {status === 'ok'   && <CheckCircle2 className="size-4 text-green-500" />}
                            {status === 'warn' && <Clock className="size-4 text-yellow-500" />}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Fila 3: Validaciones pendientes + Alertas recientes */}
      {(pendingCount > 0 || unread > 0) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          {pendingCount > 0 && (
            <Card>
              <CardHeader
                title="Documentos por revisar"
                description="Operadores esperando tu validación"
                action={
                  <Link to="/validaciones">
                    <Button variant="ghost" size="sm">
                      Revisar <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                }
              />
              <CardBody className="p-0">
                {/* Breakdown por empresa */}
                {pendingEntries?.items && (() => {
                  const byCompany = pendingEntries.items.reduce<Map<string, { name: string; count: number; items: typeof pendingEntries.items }>>(
                    (map, entry) => {
                      const { id, name } = entry.connection.company;
                      if (!map.has(id)) map.set(id, { name, count: 0, items: [] });
                      const g = map.get(id)!;
                      g.count++;
                      g.items.push(entry);
                      return map;
                    },
                    new Map(),
                  );
                  return (
                    <ul className="divide-y divide-line">
                      {[...byCompany.entries()].map(([cid, { name, count, items }]) => (
                        <li key={cid}>
                          <Link
                            to="/validaciones"
                            className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-alt/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-action/10">
                                <Inbox className="size-3.5 text-action" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-ink truncate">{name}</p>
                                <p className="text-[11px] text-ink-soft">
                                  {items.slice(0, 2).map((e) => e.fileName ?? e.rawContent.slice(0, 30)).join(' · ')}
                                  {count > 2 ? ` · +${count - 2} más` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-action/10 px-2 py-0.5 text-[12px] font-semibold text-action">
                              {count}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                {/* Totalizador */}
                <div className="flex items-center justify-between border-t border-line px-5 py-3">
                  <span className="text-[13px] text-ink-soft">Total pendientes</span>
                  <Link to="/validaciones">
                    <Button size="sm" className="h-7 text-[12px]">
                      Ver todo <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}

          {unread > 0 && (
            <Card>
              <CardHeader
                title="Alertas recientes"
                description="Márgenes que requieren atención"
                action={
                  <Link to="/alerts">
                    <Button variant="ghost" size="sm">
                      Ver todas <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                }
              />
              <CardBody className="p-0">
                <ul className="divide-y divide-line">
                  {alerts.filter((a) => !a.isRead).slice(0, 4).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                        <span className="text-[13px] text-ink">{a.message}</span>
                      </div>
                      <span className="shrink-0 text-[11px] text-ink-soft">{formatDate(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  icon: Icon, label, value, sub, to, alert,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  sub: string;
  to: string;
  alert?: boolean;
}) {
  return (
    <Link to={to}>
      <Card className="transition-shadow hover:shadow-md">
        <CardBody className="flex items-start gap-4 py-5">
          <div className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-md',
            alert ? 'bg-action/10 text-action' : 'bg-granate-tenue text-granate',
          )}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
            <p className="text-[13px] font-medium text-ink">{label}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">{sub}</p>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

// ── Macro Card ────────────────────────────────────────────────────────────────

function MacroCard({
  label, value, date, source, icon: Icon, color, note,
}: {
  label: string;
  value: string;
  date: string;
  source: string;
  icon: typeof DollarSign;
  color: 'blue' | 'red' | 'green';
  note?: string;
}) {
  const colors = {
    blue:  { bg: 'bg-blue-50',   text: 'text-blue-700',  icon: 'bg-blue-100 text-blue-600'  },
    red:   { bg: 'bg-red-50',    text: 'text-red-700',   icon: 'bg-red-100 text-red-600'    },
    green: { bg: 'bg-green-50',  text: 'text-green-700', icon: 'bg-green-100 text-green-600' },
  }[color];

  return (
    <div className={cn('rounded-lg border border-line p-4', colors.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex size-9 items-center justify-center rounded-md', colors.icon)}>
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-[12px] text-ink-soft">{label}</p>
            <p className={cn('text-xl font-bold tabular-nums', colors.text)}>{value}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            {source}
          </span>
          <p className="mt-1 text-[11px] text-ink-soft">{new Date(date).toLocaleDateString('es-AR')}</p>
        </div>
      </div>
      {note && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-red-700">
          <AlertTriangle className="size-3.5" /> {note}
        </p>
      )}
    </div>
  );
}

function EmptyMacroCard({ label, hint, to }: { label: string; hint: string; to: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface p-4">
      <p className="text-[13px] font-medium text-ink-soft">{label}</p>
      <p className="mt-1 text-[12px] text-ink-soft">{hint}</p>
      <Link to={to} className="mt-2 inline-block text-[12px] font-medium text-granate hover:text-action">
        Ir a variables macro →
      </Link>
    </div>
  );
}
