import { GraduationCap, ArrowRight } from 'lucide-react';
import iphoneMockupComplete from '@/assets/iphone-mockup-complete.png';

interface HeroSectionProps {
  onAccessClick: () => void;
  accessToken: string | null;
}

export function HeroSection({ onAccessClick, accessToken }: HeroSectionProps) {
  return (
    <section className="relative bg-surface pb-20 pt-28 lg:pt-32">
      {/* Destello de luz difuminado behind it */}
      <div
        className="pointer-events-none absolute left-1/2 lg:left-auto lg:right-[5%] top-[40%] lg:top-[25%] z-0 h-[600px] w-[600px] lg:h-[750px] lg:w-[750px] -translate-x-1/2 lg:translate-x-0 rounded-full opacity-65 blur-[120px] lg:blur-[160px]"
        style={{ background: 'radial-gradient(circle, #d13042 0%, #b31929 20%, #e8925a 42%, transparent 60%)' }}
      />



      <div className="relative mx-auto grid max-w-7xl xl:max-w-[1360px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-8 z-20">
        {/* --- Columna de texto --- */}
        <div className="relative text-center lg:text-left lg:-mt-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-granate/15 bg-granate-tenue px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-granate whitespace-nowrap animate-fade-in">
            <GraduationCap className="size-3.5 shrink-0" />
            Sello de aval profesional y académico
          </div>

          <p className="mb-2 text-sm italic text-ink-soft">Costeo profesional, sin fricción.</p>

          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[52px] xl:text-[58px] lg:mx-0">
            Automatizá tus costos, <br className="hidden sm:inline" />protegé tu margen
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft lg:text-[19px] xl:text-[20px] lg:mx-0">
            Automatizá tus costeos por inflación, dólar y paritarias. <br className="hidden lg:inline" />
            Sincronizá el BCRA e INDEC en tiempo real y recibí alertas <br className="hidden lg:inline" />
            antes de que el margen de un cliente se escape.
          </p>

          <div className="mt-10 flex items-center justify-center lg:justify-start">
            <button
              onClick={onAccessClick}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-action px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-action/20 transition-all hover:bg-action-soft hover:shadow-xl"
            >
              {accessToken ? 'Ir al Panel' : 'Acceder al Panel'}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* --- Columna del mockup (iPhone Fotorrealista de Usuario en 3D con Screenshot Real) --- */}
        <div className="relative flex select-none items-center justify-center py-4 lg:-mt-10">
          {/* Contenedor del Teléfono (Imagen Mockup Integrada con Sombra Avanzada, Mayor Escala en Mobile y Proporcionado en Desktop) */}
          <div className="relative w-full max-w-[800px] lg:max-w-none scale-[1.5] -translate-y-8 sm:scale-100 sm:translate-y-0 lg:scale-100 xl:scale-105 origin-center my-14 sm:my-0 filter drop-shadow-[0_50px_80px_rgba(0,0,0,0.28)] drop-shadow-[0_25px_50px_rgba(179,25,41,0.18)]">
            <img 
              src={iphoneMockupComplete} 
              alt="iPhone 14 Pro CosteAR" 
              className="w-full h-auto pointer-events-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
