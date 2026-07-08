import { LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface NavbarProps {
  onAccessClick: () => void;
}

export function Navbar({ onAccessClick }: NavbarProps) {
  const { accessToken } = useAuthStore();

  return (
    <header className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl lg:max-w-7xl xl:max-w-[1360px] -translate-x-1/2 rounded-full border border-line/80 bg-surface/80 px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold tracking-tight text-ink">CosteAR</span>

        <nav className="hidden items-center gap-8 text-xs font-semibold text-ink-soft md:flex">
          <a href="#features" className="transition-colors hover:text-ink">Características</a>
          <a href="#como-funciona" className="transition-colors hover:text-ink">Cómo funciona</a>
          <a href="mailto:proyectocostear@gmail.com" className="transition-colors hover:text-ink">Contacto</a>
        </nav>

        <button
          type="button"
          onClick={onAccessClick}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 bg-surface px-4 py-1.5 text-[11px] font-semibold text-ink transition-all duration-200 hover:border-granate hover:text-granate"
        >
          {accessToken ? 'Ir al Panel' : 'Acceso Equipo'}
          <LogIn className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
