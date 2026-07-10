import { cn } from '@/lib/utils';
import { CosteARLogo } from './CosteARLogo';

interface Props {
  /** true mientras se desvanece de salida (cross-fade con el contenido que aparece debajo). */
  exiting?: boolean;
}

export function CosteARLoadingScreen({ exiting = false }: Props) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-surface transition-opacity duration-300 ease-out',
        exiting ? 'opacity-0' : 'opacity-100',
      )}
    >
      <CosteARLogo mode="draw" className="w-24 h-24 text-granate" />
    </div>
  );
}
