import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiErrorMessage } from '@/lib/api';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setError(null);
    try {
      const res = await api.post<{ data: { qrDataUrl: string } }>('/auth/2fa/setup');
      setQr(res.data.data.qrDataUrl);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const confirm = async () => {
    setError(null);
    try {
      const res = await api.post<{ data: { backupCodes: string[] } }>('/auth/2fa/confirm', { code });
      setBackupCodes(res.data.data.backupCodes);
      setQr(null);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <AppShell>
      <PageHeader title="Mi perfil" description="Datos de cuenta y seguridad" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Datos personales" />
          <CardBody className="space-y-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-ink-soft">Nombre</div>
              <div className="text-sm text-ink">{user?.name}</div>
            </div>
            <div>
              <div className="text-[12px] uppercase tracking-wide text-ink-soft">Email</div>
              <div className="text-sm text-ink">{user?.email}</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Verificación en dos pasos"
            description="Protegé tu cuenta con un segundo factor (TOTP)"
          />
          <CardBody className="space-y-4">
            {backupCodes ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-ok">
                  <ShieldCheck className="size-5" />
                  <span className="text-sm font-medium">2FA activado</span>
                </div>
                <p className="text-[13px] text-ink-soft">
                  Guardá estos códigos de respaldo en un lugar seguro. No se vuelven a mostrar.
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-alt p-3">
                  {backupCodes.map((c) => (
                    <span key={c} className="tabular text-sm text-ink">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : qr ? (
              <div className="space-y-3">
                <p className="text-[13px] text-ink-soft">
                  Escaneá el código con Google Authenticator o Authy y confirmá con el código de 6
                  dígitos.
                </p>
                <img src={qr} alt="QR de configuración 2FA" className="size-44 rounded-md border border-line" />
                <Input
                  label="Código de verificación"
                  numeric
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                />
                <Button size="sm" onClick={confirm}>
                  Confirmar y activar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-ink-soft">
                  <ShieldOff className="size-5" />
                  <span className="text-sm">2FA no configurado</span>
                </div>
                <Button variant="secondary" size="sm" onClick={startSetup}>
                  Activar 2FA
                </Button>
              </div>
            )}
            {error && (
              <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
