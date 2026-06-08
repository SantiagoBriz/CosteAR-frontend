import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForgotPassword } from './auth-hooks';

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit } = useForm<{ email: string }>();

  const onSubmit = handleSubmit(async ({ email }) => {
    await forgot.mutateAsync(email).catch(() => undefined);
    setSent(true); // respuesta neutra siempre (anti-enumeración)
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6 py-12">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 shadow-sm animate-rise">
        <h1 className="text-2xl font-bold text-ink">Restablecer contraseña</h1>
        {sent ? (
          <p className="mt-3 text-sm text-ink-soft">
            Si el email existe, te enviamos instrucciones para restablecer tu contraseña. Revisá
            tu casilla.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-5">
            <p className="text-sm text-ink-soft">
              Ingresá tu email y te enviaremos un enlace para restablecerla.
            </p>
            <Input label="Email" type="email" {...register('email', { required: true })} />
            <Button type="submit" className="w-full" loading={forgot.isPending}>
              Enviar enlace
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
