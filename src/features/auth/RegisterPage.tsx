import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRegister } from './auth-hooks';
import { apiErrorMessage } from '@/lib/api';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useRegister();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterForm>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await registerUser.mutateAsync(values);
      await navigate({ to: '/dashboard' });
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-lg border border-line bg-surface p-8 shadow-sm animate-rise"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-action font-bold text-white">
            C
          </div>
          <span className="text-xl font-bold tracking-tight text-granate">CosteAR</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Creá tu cuenta</h1>
          <p className="mt-1 text-sm text-ink-soft">Empezá a automatizar tus costos</p>
        </div>

        <Input label="Nombre" autoComplete="name" {...register('name', { required: true })} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email', { required: true })}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres, con mayúscula, minúscula y número"
          {...register('password', { required: true })}
        />

        {error && (
          <div className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
        )}

        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Crear cuenta
        </Button>

        <p className="text-center text-[13px] text-ink-soft">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-granate hover:text-action">
            Ingresá
          </Link>
        </p>
      </form>
    </div>
  );
}
