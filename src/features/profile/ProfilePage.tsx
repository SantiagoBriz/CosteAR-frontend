import { useState, useRef } from 'react';
import { ShieldCheck, ShieldOff, Camera, User } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth-store';
import { api, apiErrorMessage } from '@/lib/api';
import { AvatarCropModal } from './AvatarCropModal';

const MAX_AVATAR_BYTES = 6 * 1024 * 1024;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Foto de perfil: seleccionar archivo → recortar → subir.
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    if (!file.type.startsWith('image/')) { setAvatarError('El archivo tiene que ser una imagen.'); return; }
    if (file.size > MAX_AVATAR_BYTES) { setAvatarError('La imagen supera los 6 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async (data: { imageData: string; mimeType: string }) => {
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await api.post<{ data: { avatarUrl: string } }>('/user/avatar', data);
      patchUser({ avatarUrl: res.data.data.avatarUrl });
      setCropSrc(null);
    } catch (e) {
      setAvatarError(apiErrorMessage(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

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
          <CardBody className="space-y-4">
            {/* Foto de perfil */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Foto de perfil" className="size-20 rounded-full object-cover ring-1 ring-line" />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full bg-granate-tenue text-granate ring-1 ring-line">
                    <User className="size-8" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Cambiar foto"
                  className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-granate text-white shadow hover:bg-action"
                >
                  <Camera className="size-3.5" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Foto de perfil</p>
                <p className="text-[12px] text-ink-soft">JPG, PNG o WebP · hasta 6 MB. Vas a poder recortarla.</p>
                {avatarError && <p className="mt-1 text-[12px] text-danger">{avatarError}</p>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
            </div>

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

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          saving={uploadingAvatar}
          onCancel={() => setCropSrc(null)}
          onSave={handleSaveAvatar}
        />
      )}
    </AppShell>
  );
}
