import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from './auth-hooks';
import { apiErrorMessage } from '@/lib/api';

interface LoginForm {
  identifier: string;
  password: string;
  twoFactorCode?: string;
}

const CUIT_RE_COMPLETE = /^\d{2}-\d{8}-\d$/;
const EMAIL_RE = /\S+@\S+\.\S+/;

/** Formatea dígitos de CUIT a XX-XXXXXXXX-X automáticamente mientras se escribe. */
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
  const { register, handleSubmit, formState, watch, setValue } = useForm<LoginForm>();

  const identifierValue = watch('identifier', '');
  const isEmail = identifierValue.includes('@');
  const isCuit = !isEmail;

  // Para CUIT: validar formato completo. Para email: validar formato email.
  const cuitDigits = identifierValue.replace(/\D/g, '');
  const cuitTyping = isCuit && cuitDigits.length > 0 && cuitDigits.length < 11;
  const identifierValid = isEmail
    ? EMAIL_RE.test(identifierValue)
    : CUIT_RE_COMPLETE.test(identifierValue);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await login.mutateAsync(values);
      // Si el operador debe cambiar su contraseña, redirigir
      if (result?.mustChangePassword) {
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
      <div className="relative hidden flex-col justify-between bg-granate-deep p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-action font-bold">C</div>
          <span className="text-xl font-bold tracking-tight">CosteAR</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Más clientes.<br />Los mismos fines de semana.
          </h2>
          <p className="mt-4 text-white/70">
            El exoesqueleto de tus planillas de costos. Actualizá las estructuras de toda tu
            cartera ante cada salto macroeconómico, en minutos.
          </p>
        </div>
        <p className="text-[13px] text-white/50">
          Validado por la Cátedra de Costos · FCE — Universidad Nacional de Tucumán
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 animate-rise">
          <div>
            <h1 className="text-2xl font-bold text-ink">Ingresá a tu cuenta</h1>
            <p className="mt-1 text-sm text-ink-soft">Gestioná los costos de tu cartera</p>
          </div>

          <div>
            <Input
              label="CUIT / Email"
              autoComplete="username"
              placeholder="20-12345678-9 o tu email"
              inputMode={isEmail ? 'email' : 'numeric'}
              {...register('identifier', { required: true })}
              onChange={(e) => {
                // Si hay @, es email → no formatear. Si no, auto-formatear como CUIT.
                const val = e.target.value;
                const formatted = val.includes('@') ? val : formatCuit(val);
                setValue('identifier', formatted, { shouldValidate: false });
              }}
            />
            {cuitTyping && (
              <p className="mt-1 text-[12px] text-yellow-600">
                Faltan {11 - cuitDigits.length} dígitos
              </p>
            )}
          </div>

          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            {...register('password', { required: true })}
          />
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

          <Button type="submit" className="w-full" loading={formState.isSubmitting} disabled={!identifierValid}>
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
      </div>
    </div>
  );
}
