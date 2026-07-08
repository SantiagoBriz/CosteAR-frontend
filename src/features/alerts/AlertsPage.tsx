import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { AdvisorPanel } from '@/features/advisor/AdvisorPanel';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn, formatDate } from '@/lib/utils';
import {
  useAlerts,
  useMarkAlertRead,
  useAlertSettings,
  useUpdateAlertSettings,
} from './alert-hooks';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { AlertTriangle, BellRing, Mail } from 'lucide-react';

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

  const unreadCount = alerts?.filter((a) => !a.isRead).length ?? 0;

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
          <CardHeader
            title="Historial"
            action={
              !!unreadCount && (
                <span className="rounded-full border border-warn/20 bg-warn/10 px-3.5 py-1.5 text-[12px] font-bold text-warn shadow-sm">
                  {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                </span>
              )
            }
          />
          <CardBody>
            {!alerts?.length ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-white text-granate shadow-sm">
                  <BellRing className="size-6" />
                </div>
                <p className="text-[13px] font-bold text-ink">Todo tranquilo</p>
                <p className="mt-1 text-[11px] text-ink-soft">Sin alertas registradas.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="p-3.5 bg-white border border-line rounded-2xl flex items-start gap-3 hover:border-granate/10 transition-all duration-200 shadow-[0_2px_8px_rgba(74,21,27,0.005)]"
                  >
                    <AlertTriangle
                      className={cn('size-4 shrink-0 mt-0.5', a.isRead ? 'text-ink-soft/40' : 'text-amber-600')}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5">
                        <StatusBadge status={a.isRead ? 'idle' : 'warn'}>
                          {a.isRead ? 'Leída' : 'Nueva'}
                        </StatusBadge>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-ink font-bold line-clamp-2">
                        {a.message}
                      </p>
                      <p className="text-[9.5px] text-ink-soft/80 mt-1 font-semibold">
                        {formatDate(a.createdAt)}
                      </p>
                    </div>
                    {!a.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead.mutate(a.id)}
                        className="shrink-0"
                      >
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
                <label className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 cursor-pointer select-none hover:border-granate/20 transition-colors duration-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line text-granate accent-granate"
                    {...register('emailNotifications')}
                  />
                  <span className="text-[13px] font-semibold text-ink">Recibir alertas por email</span>
                </label>
                <Button type="submit" size="sm" className="w-full" loading={updateSettings.isPending}>
                  Guardar
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="h-fit border-action/15 bg-action/[0.04]">
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-action/20 bg-white text-action shadow-sm">
                  <Mail className="size-3.5" />
                </span>
                <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-action">
                  Config. de email (servidor)
                </span>
              </div>
              <p className="text-[12px] text-ink-soft leading-relaxed">
                Para usar Gmail SMTP, configurá estas variables de entorno en el servidor:
              </p>
              <pre className="rounded-xl border border-line bg-surface-alt px-3 py-2.5 text-[11px] font-mono text-ink leading-relaxed overflow-x-auto">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASS=<contraseña-de-app>
EMAIL_FROM=tu@gmail.com`}</pre>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Usá una <strong>Contraseña de aplicación</strong> de Google (no tu contraseña normal). Activala en tu cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
