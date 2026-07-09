import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useResetPassword } from './auth-hooks';
import { apiErrorMessage } from '@/lib/api';

interface FormValues {
  password: string;
  confirm: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const reset = useResetPassword();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El token viene en la URL del email: /reset-password?token=xxx
  const token = new URLSearchParams(window.location.search).get('token') ?? '';

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
      setTimeout(() => navigate({ to: '/login' }), 2500);
    } catch (e) {
      setError(apiErrorMessage(e) || 'El enlace venció o no es válido. Pedí uno nuevo.');
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6 py-12">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 shadow-sm animate-rise">
        <h1 className="text-2xl font-bold text-ink">Nueva contraseña</h1>

        {done ? (
          <div className="mt-4 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-10 text-ok" />
            <p className="text-sm font-medium text-ink">¡Contraseña actualizada!</p>
            <p className="mt-1 text-[13px] text-ink-soft">Te llevamos al login…</p>
          </div>
        ) : !token ? (
          <div className="mt-4">
            <p className="text-sm text-ink-soft">
              El enlace no es válido o está incompleto. Pedí uno nuevo desde "Olvidé mi contraseña".
            </p>
            <Link to="/forgot-password" className="mt-4 inline-block text-[13px] text-granate hover:text-action">
              Pedir un nuevo enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <p className="text-sm text-ink-soft">Elegí una contraseña nueva (mínimo 10 caracteres).</p>
            <Input
              label="Contraseña nueva"
              type="password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Ingresá una contraseña',
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
              })}
            />
            <Input
              label="Repetir contraseña"
              type="password"
              error={errors.confirm?.message}
              {...register('confirm', {
                required: 'Repetí la contraseña',
                validate: (v) => v === watch('password') || 'Las contraseñas no coinciden',
              })}
            />
            {error && (
              <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
            )}
            <Button type="submit" className="w-full" loading={reset.isPending}>
              Guardar contraseña
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-[13px]">
          <Link to="/login" className="text-granate hover:text-action">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
