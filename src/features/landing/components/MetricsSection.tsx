import { ArrowUpRight } from 'lucide-react';

export function MetricsSection() {
  return (
    <section className="relative z-30 bg-transparent -mt-16 pb-6 md:mt-0 md:py-6">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          
          {/* Card 1: Margen Bruto */}
          <div className="group relative rounded-2xl border border-line/60 bg-surface/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-granate/30 hover:shadow-[0_12px_40px_rgba(74,21,27,0.06)]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Margen Bruto Promedio</span>
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                +4.2% <ArrowUpRight className="size-2.5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-extrabold text-granate">34.8%</span>
            </div>
            {/* Mini visual sparkline SVG */}
            <div className="mt-3 h-8 w-full opacity-60 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible">
                <path
                  d="M0,25 Q15,10 30,22 T60,5 T90,12 L100,10"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Tiempo Ahorrado */}
          <div className="group relative rounded-2xl border border-line/60 bg-surface/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-granate/30 hover:shadow-[0_12px_40px_rgba(74,21,27,0.06)]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Tiempo Ahorrado</span>
              <span className="rounded-full bg-granate-tenue px-1.5 py-0.5 text-[9px] font-bold text-granate">
                Horas / Mes
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-extrabold text-ink">90%</span>
            </div>
            {/* Sparkline for time savings */}
            <div className="mt-3 h-8 w-full opacity-60 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible">
                <path
                  d="M0,28 L20,20 L40,15 L60,8 L80,4 L100,2"
                  fill="none"
                  stroke="#4a151b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Dólar Blue */}
          <div className="group relative rounded-2xl border border-line/60 bg-surface/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-granate/30 hover:shadow-[0_12px_40px_rgba(74,21,27,0.06)]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Dólar Blue</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Ámbito
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-extrabold text-granate">$1.509</span>
            </div>
            <div className="mt-3 text-[10px] text-ink-soft/80 flex items-center justify-between border-t border-line/40 pt-2 font-mono">
              <span>Sincronizado</span>
              <span>Hoy 10:15</span>
            </div>
          </div>

          {/* Card 4: IPC INDEC */}
          <div className="group relative rounded-2xl border border-line/60 bg-surface/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-granate/30 hover:shadow-[0_12px_40px_rgba(74,21,27,0.06)]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">Inflación Mensual</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                INDEC
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-extrabold text-ink">4.2%</span>
              <span className="text-xs text-ink-soft/70 font-semibold">mayo</span>
            </div>
            <div className="mt-3 text-[10px] text-ink-soft/80 flex items-center justify-between border-t border-line/40 pt-2 font-mono">
              <span>Publicado</span>
              <span>13/06/2026</span>
            </div>
          </div>

        </div>
        <p className="mx-auto mt-8 max-w-lg text-center text-xs italic leading-relaxed text-ink-soft/50 font-sans">
          Algoritmos matemáticos y valuación validados bajo estándares profesionales y académicos de costos.
        </p>
      </div>
    </section>
  );
}
