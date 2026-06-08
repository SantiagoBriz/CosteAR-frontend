import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from './auth-hooks';
import { apiErrorMessage } from '@/lib/api';

interface LoginForm {
  cuit: string;
  password: string;
  twoFactorCode?: string;
}

const CUIT_RE = /^\d{2}-?\d{8}-?\d$/;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState, watch } = useForm<LoginForm>();

  const cuitValue = watch('cuit', '');
  const cuitInvalid = cuitValue.length > 0 && !CUIT_RE.test(cuitValue.replace(/\s/g, ''));

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await login.mutateAsync(values);
      await navigate({ to: '/dashboard' });
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
              label="CUIT / CUIL"
              autoComplete="username"
              placeholder="20-12345678-9"
              {...register('cuit', { required: true })}
            />
            {cuitInvalid && (
              <p className="mt-1 text-[12px] text-danger">Formato: 20-12345678-9 (11 dígitos)</p>
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

          <Button type="submit" className="w-full" loading={formState.isSubmitting} disabled={cuitInvalid}>
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
