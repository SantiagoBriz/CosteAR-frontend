import { Link } from '@tanstack/react-router';
import { Building2, Bell, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useCompanies } from '@/features/companies/company-hooks';
import { useAlerts } from '@/features/alerts/alert-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: companies } = useCompanies();
  const { data: alerts } = useAlerts();

  const totalStructures =
    companies?.reduce((acc, c) => acc + (c._count?.costStructures ?? 0), 0) ?? 0;
  const unread = alerts?.filter((a) => !a.isRead).length ?? 0;

  return (
    <AppShell>
      <PageHeader
        title={`Hola, ${user?.name?.split(' ')[0] ?? 'costista'}`}
        description="El estado de tu cartera de un vistazo"
      />

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Building2} label="Clientes activos" value={companies?.length ?? 0} to="/companies" />
        <Metric icon={FileSpreadsheet} label="Estructuras de costos" value={totalStructures} to="/companies" />
        <Metric icon={Bell} label="Alertas sin leer" value={unread} to="/alerts" emphasize={unread > 0} />
      </div>

      {/* Alertas recientes */}
      <div className="mt-8">
        <Card>
          <CardHeader
            title="Alertas recientes"
            description="Márgenes que requieren tu atención"
            action={
              <Link to="/alerts">
                <Button variant="ghost" size="sm">
                  Ver todas <ArrowRight className="size-4" />
                </Button>
              </Link>
            }
          />
          <CardBody className="p-0">
            {!alerts?.length ? (
              <div className="px-6 py-12 text-center text-sm text-ink-soft">
                Sin alertas. Tus márgenes están bajo control.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {alerts.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <StatusBadge status="warn">Margen</StatusBadge>
                      <span className="text-sm text-ink">{a.message}</span>
                    </div>
                    <span className="text-[12px] text-ink-soft">{formatDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  to,
  emphasize,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  to: string;
  emphasize?: boolean;
}) {
  return (
    <Link to={to}>
      <Card className="transition-shadow hover:shadow-md">
        <CardBody className="flex items-center gap-4">
          <div
            className={`flex size-11 items-center justify-center rounded-md ${
              emphasize ? 'bg-action/10 text-action' : 'bg-granate-tenue text-granate'
            }`}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular text-ink">{value}</div>
            <div className="text-[13px] text-ink-soft">{label}</div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
