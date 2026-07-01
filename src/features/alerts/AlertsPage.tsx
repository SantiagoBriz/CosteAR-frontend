import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
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
import { useEffect } from 'react';
import { Mail } from 'lucide-react';

interface SettingsForm {
  marginThresholdPct: number;
  emailNotifications: boolean;
}

export function AlertsPage() {
  const { data: alerts } = useAlerts();
  const markRead = useMarkAlertRead();
  const { data: settings } = useAlertSettings();
  const updateSettings = useUpdateAlertSettings();
  const { register, handleSubmit, reset } = useForm<SettingsForm>({
    defaultValues: { marginThresholdPct: 15, emailNotifications: true },
  });

  useEffect(() => {
    if (settings != null) {
      reset({
        marginThresholdPct: Number(settings.marginThresholdPct),
        emailNotifications: settings.emailNotifications ?? true,
      });
    }
  }, [settings, reset]);

  const onSave = handleSubmit(async ({ marginThresholdPct, emailNotifications }) => {
    await updateSettings.mutateAsync({
      marginThresholdPct: Number(marginThresholdPct),
      emailNotifications,
    });
  });

  return (
    <AppShell>
      <PageHeader title="Alertas" description="Tu sistema de aviso temprano de márgenes" />

      {!!alerts?.length && (
        <div className="mb-5">
          <AdvisorPanel
            kind="alerts"
            label="Priorizar alertas"
            context={{
              alertas: alerts.slice(0, 40).map((a) => ({
                mensaje: a.message,
                leida: a.isRead,
                fecha: a.createdAt,
              })),
            }}
          />
        </div>
      )}

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

        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader title="Configuración" />
            <CardBody>
              <form onSubmit={onSave} className="space-y-4">
                <Input
                  label="Umbral de margen (%)"
                  type="number"
                  step="0.1"
                  numeric
                  hint="Te avisamos si el margen cae por debajo de este valor"
                  {...register('marginThresholdPct', { required: true, valueAsNumber: true })}
                />
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-granate accent-granate"
                    {...register('emailNotifications')}
                  />
                  <span className="text-sm text-ink">Recibir alertas por email</span>
                </label>
                <Button type="submit" size="sm" className="w-full" loading={updateSettings.isPending}>
                  Guardar
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="h-fit border-action/20 bg-action/5">
            <CardBody className="space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-action">
                <Mail className="size-3.5" /> Configuración de email (servidor)
              </div>
              <p className="text-[12px] text-ink-soft leading-relaxed">
                Para usar Gmail SMTP, configurá estas variables de entorno en el servidor:
              </p>
              <pre className="rounded bg-surface-alt px-3 py-2 text-[11px] font-mono text-ink leading-relaxed overflow-x-auto">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASS=<contraseña-de-app>
EMAIL_FROM=tu@gmail.com`}</pre>
              <p className="text-[11px] text-ink-soft">
                Usá una <strong>Contraseña de aplicación</strong> de Google (no tu contraseña normal). Activala en tu cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
