import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-alt px-6 text-center">
      {/* Número grande */}
      <div
        aria-hidden
        className="select-none text-[160px] font-extrabold leading-none tracking-tighter text-granate/10"
      >
        404
      </div>

      {/* Texto */}
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">
        La URL que buscás no existe o fue movida. Revisá el link o volvé al inicio.
      </p>

      <div className="mt-8 flex gap-3">
        <Link to="/dashboard">
          <Button>
            <ArrowLeft className="size-4" /> Ir al inicio
          </Button>
        </Link>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Volver atrás
        </Button>
      </div>
    </div>
  );
}
