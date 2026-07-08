import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from './auth-hooks';
import { apiErrorMessage } from '@/lib/api';

const FEATURE_BULLETS = [
  'Recalculá toda tu cartera de clientes en un solo movimiento',
  'Alertas automáticas ante variaciones de insumos y tipo de cambio',
  'Validado académicamente por la Cátedra de Costos — FCE UNT',
];

interface LoginForm {
  identifier: string;
  password: string;
  twoFactorCode?: string;
}


/** True si el valor parece ser un CUIT/CUIL (solo dígitos y guiones, sin letras). */
function looksLikeCuit(val: string): boolean {
  return /^[\d\-]+$/.test(val);
}

/** Formatea dígitos a XX-XXXXXXXX-X mientras se escribe. */
function formatCuit(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState, watch, setValue } = useForm<LoginForm>();

  const identifierValue = watch('identifier', '');

  // Se considera email si contiene @ O si tiene letras (está escribiendo un email sin @ aún)
  const hasLetters = /[a-zA-Z]/.test(identifierValue);
  const isEmail = identifierValue.includes('@') || hasLetters;
  const isCuitMode = !isEmail && looksLikeCuit(identifierValue);

  const cuitDigits = identifierValue.replace(/\D/g, '');
  const cuitTyping = isCuitMode && cuitDigits.length > 0 && cuitDigits.length < 11;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await login.mutateAsync(values);
      if (result?.user?.mustChangePassword) {
        await navigate({ to: '/change-password' });
      } else {
        await navigate({ to: '/dashboard' });
      }
    } catch (e) {
      const msg = apiErrorMessage(e);
      if (msg.toLowerCase().includes('dos factores') || msg.includes('TWO_FACTOR')) {
        setNeeds2fa(true);
        setError('Ingresá el código de tu app de autenticación');
      } else {
        setError(msg);
      }
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-granate-deep p-14 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-40 size-[520px] rounded-full bg-action/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-action text-lg font-bold">C</div>
          <span className="text-xl font-bold tracking-tight">CosteAR</span>
        </div>

        <div className="relative max-w-md space-y-7">
          <div>
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight">
              Más clientes.<br />Los mismos fines de semana.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">
              El exoesqueleto de tus planillas de costos. Actualizá las estructuras de toda tu
              cartera ante cada salto macroeconómico, en minutos.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURE_BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-action">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </span>
                <span className="text-[14px] leading-snug text-white/90">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[13px] text-white/50">
          Validado por la Cátedra de Costos · FCE — Universidad Nacional de Tucumán
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-surface-alt px-6 py-12">
        <div className="w-full max-w-sm animate-rise">
          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-lg border border-line bg-surface p-8 shadow-sm"
          >
            <div>
              <h1 className="text-2xl font-bold text-ink">Ingresá a tu cuenta</h1>
              <p className="mt-1 text-sm text-ink-soft">Gestioná los costos de tu cartera</p>
            </div>

            <div>
              <Input
                label="CUIT/CUIL o email"
                autoComplete="username"
                placeholder="20-12345678-9 o usuario@mail.com"
                inputMode={isEmail ? 'email' : 'numeric'}
                {...register('identifier', { required: true })}
                onChange={(e) => {
                  const val = e.target.value;
                  // Solo auto-formatear si es modo CUIT (sin letras, sin @)
                  const formatted = looksLikeCuit(val) && !val.includes('@')
                    ? formatCuit(val)
                    : val;
                  setValue('identifier', formatted, { shouldValidate: false });
                }}
              />
              {cuitTyping && (
                <p className="mt-1 text-[12px] text-yellow-600">
                  Faltan {11 - cuitDigits.length} dígitos
                </p>
              )}
            </div>

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                className="pr-10"
                {...register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute bottom-0 right-0 flex h-11 w-10 items-center justify-center text-ink-soft hover:text-granate"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {needs2fa && (
              <Input
                label="Código de verificación"
                inputMode="numeric"
                placeholder="000000"
                numeric
                {...register('twoFactorCode')}
              />
            )}

            {error && (
              <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={formState.isSubmitting}
              disabled={!identifierValue.trim() || !watch('password')}
            >
              Ingresar
            </Button>

            <div className="flex items-center justify-between text-[13px]">
              <Link to="/forgot-password" className="text-granate hover:text-action">
                Olvidé mi contraseña
              </Link>
              <Link to="/register" className="text-granate hover:text-action">
                Crear cuenta
              </Link>
            </div>
          </form>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-ink-soft">
            <ShieldCheck className="size-3.5 text-ink-soft" />
            Conexión cifrada de extremo a extremo
          </p>
        </div>
      </div>
    </div>
  );
}
