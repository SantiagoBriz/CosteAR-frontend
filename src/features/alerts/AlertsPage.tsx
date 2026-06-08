import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import {
  useAlerts,
  useMarkAlertRead,
  useAlertSettings,
  useUpdateAlertSettings,
} from './alert-hooks';
import { useForm } from 'react-hook-form';

export function AlertsPage() {
  const { data: alerts } = useAlerts();
  const markRead = useMarkAlertRead();
  const { data: settings } = useAlertSettings();
  const updateSettings = useUpdateAlertSettings();
  const { register, handleSubmit } = useForm<{ marginThresholdPct: number }>();

  const onSaveThreshold = handleSubmit(async ({ marginThresholdPct }) => {
    await updateSettings.mutateAsync({ marginThresholdPct: Number(marginThresholdPct) });
  });

  return (
    <AppShell>
      <PageHeader title="Alertas" description="Tu sistema de aviso temprano de márgenes" />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Historial" />
          <CardBody className="p-0">
            {!alerts?.length ? (
              <div className="px-6 py-12 text-center text-sm text-ink-soft">
                Sin alertas registradas.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={a.isRead ? 'idle' : 'warn'}>
                        {a.isRead ? 'Leída' : 'Nueva'}
                      </StatusBadge>
                      <div>
                        <p className="text-sm text-ink">{a.message}</p>
                        <p className="text-[12px] text-ink-soft">{formatDate(a.createdAt)}</p>
                      </div>
                    </div>
                    {!a.isRead && (
                      <Button variant="ghost" size="sm" onClick={() => markRead.mutate(a.id)}>
                        Marcar leída
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Configuración" />
          <CardBody>
            <form onSubmit={onSaveThreshold} className="space-y-4">
              <Input
                label="Umbral de margen (%)"
                type="number"
                step="0.1"
                numeric
                defaultValue={settings ? Number(settings.marginThresholdPct) : 15}
                hint="Te avisamos si el margen cae por debajo de este valor"
                {...register('marginThresholdPct', { required: true })}
              />
              <Button type="submit" size="sm" className="w-full" loading={updateSettings.isPending}>
                Guardar
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
