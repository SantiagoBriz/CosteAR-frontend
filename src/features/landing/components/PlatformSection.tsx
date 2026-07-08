import { Globe, Monitor, Smartphone, Check, Clock } from 'lucide-react';

export function PlatformSection() {
  return (
    <section className="bg-transparent py-16 border-t border-line/40">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-granate">Multiplataforma</p>
          <h3 className="text-2xl font-extrabold text-ink sm:text-3xl mt-1">
            Llevá tus costos a donde vayas
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft max-w-md mx-auto">
            Accedé a tus estructuras desde cualquier dispositivo con sincronización automática en la nube.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Web App */}
          <div className="group relative rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all duration-300 hover:border-granate/20 hover:shadow-md animate-fade-in">
            <div className="flex justify-between items-start mb-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Globe className="size-5.5" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Disponible
              </span>
            </div>
            <h4 className="text-sm font-bold text-ink mb-1">Versión Web (Nube)</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft mb-4">
              Ingresá desde cualquier navegador en PC, tablet o celular. Ideal para trabajo colaborativo.
            </p>
            <div className="border-t border-line/40 pt-3 text-[10px] text-emerald-700 font-semibold flex items-center gap-1 font-mono">
              <Check className="size-3" /> Sin descargas · Carga al instante
            </div>
          </div>

          {/* Desktop App */}
          <div className="group relative rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all duration-300 hover:border-granate/20 hover:shadow-md animate-fade-in">
            <div className="flex justify-between items-start mb-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Monitor className="size-5.5" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                Muy Pronto
              </span>
            </div>
            <h4 className="text-sm font-bold text-ink mb-1">Aplicación de Escritorio</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft mb-4">
              Instalador nativo para Windows (.exe) y macOS (.app). Rendimiento optimizado y soporte sin conexión.
            </p>
            <div className="border-t border-line/40 pt-3 text-[10px] text-amber-700 font-semibold flex items-center gap-1 font-mono">
              <Clock className="size-3" /> Lanzamiento · Q3 2026
            </div>
          </div>

          {/* Mobile App */}
          <div className="group relative rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all duration-300 hover:border-granate/20 hover:shadow-md animate-fade-in">
            <div className="flex justify-between items-start mb-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Smartphone className="size-5.5" />
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                Próximamente
              </span>
            </div>
            <h4 className="text-sm font-bold text-ink mb-1">Mobile (App Store &amp; Play)</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft mb-4">
              Aplicaciones nativas para iOS y Android. Notificaciones push y control rápido de márgenes en planta.
            </p>
            <div className="border-t border-line/40 pt-3 text-[10px] text-slate-500 font-semibold flex items-center gap-1 font-mono">
              <Clock className="size-3" /> Lanzamiento · Q4 2026
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
