import { Globe, Monitor, Smartphone } from 'lucide-react';
import appStoreIcon from '@/assets/appstore_icon.png';
import playStoreIcon from '@/assets/playstore_icon.png';

function WindowsIcon() {
  return (
    <svg viewBox="0 0 88 88" className="size-4" aria-label="Windows">
      <rect x="0"  y="0"  width="40" height="40" rx="4" fill="#F25022"/>
      <rect x="48" y="0"  width="40" height="40" rx="4" fill="#7FBA00"/>
      <rect x="0"  y="48" width="40" height="40" rx="4" fill="#00A4EF"/>
      <rect x="48" y="48" width="40" height="40" rx="4" fill="#FFB900"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-ink-soft" fill="currentColor" aria-label="macOS">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.029 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-ink-soft" fill="currentColor" aria-label="Linux">
      <path d="M12.504 0c-.155 0-.315.008-.48.021C7.767.333 8.884 4.741 8.818 6.184c-.076 1.074-.292 1.925-1.038 2.977C6.895 10.215 5.67 11.876 5.093 13.62c-.272.82-.404 1.669-.283 2.464.114.77.558 1.538 1.165 2.083.613.56 1.388.755 2.119.836.727.085 1.461.06 2.062.034.609-.027 1.088-.05 1.399-.038.374.013.66.115.944.305.28.187.53.461.8.75.268.288.553.598.867.832.313.234.664.41 1.095.41s.781-.176 1.094-.41c.314-.234.6-.544.868-.832.27-.289.52-.563.8-.75.283-.19.57-.292.944-.305.31-.012.79.011 1.4.038.6.026 1.334.05 2.061-.034.731-.08 1.507-.277 2.12-.836.606-.545 1.05-1.313 1.164-2.083.12-.795-.012-1.644-.283-2.464-.577-1.744-1.8-3.405-2.687-4.459-.748-1.052-.963-1.903-1.04-2.977-.065-1.435 1.054-5.862-3.172-6.161a9.627 9.627 0 0 0-.48-.021zm-4.94 4.794c.159-.965.603-1.782 1.4-2.248.807-.466 1.879-.56 3.036-.56s2.23.094 3.037.56c.797.466 1.241 1.283 1.4 2.248.315 1.91-.193 4.405-1.245 5.87-.66.916-.928 1.8-.928 2.856v.417c0 .275-.026.55-.077.822-.224 1.192-.938 2.253-2.003 2.74a1.88 1.88 0 0 1-.67.157 1.878 1.878 0 0 1-.67-.158c-1.066-.486-1.779-1.547-2.004-2.739a5.296 5.296 0 0 1-.077-.822v-.417c0-1.056-.267-1.94-.927-2.856C4.357 9.199 3.849 6.704 4.564 4.794z"/>
    </svg>
  );
}

export function PlatformSection() {
  return (
    <section className="bg-transparent py-8 border-t border-line/40">
      <div className="mx-auto max-w-5xl px-6">

        {/* Header compacto */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-granate">Multiplataforma</p>
          <h3 className="text-2xl font-extrabold text-ink mt-1">
            Llevá tus costos a donde vayas
          </h3>
        </div>

        {/* Strip unificado */}
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-line/60 rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">

          {/* Web */}
          <div className="flex-1 flex items-center gap-3.5 px-6 py-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Globe className="size-[18px]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-ink">Web App</span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <span className="text-[11px] text-ink-soft">Sin descarga · Abrís y listo</span>
            </div>
          </div>

          {/* Escritorio */}
          <div className="flex-1 flex items-center gap-3.5 px-6 py-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Monitor className="size-[18px]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-ink">Escritorio</span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Pronto
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <WindowsIcon />
                <AppleIcon />
                <LinuxIcon />
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex-1 flex items-center gap-3.5 px-6 py-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Smartphone className="size-[18px]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-ink">Mobile</span>
                <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Pronto
                </span>
              </div>
              <div className="flex items-center gap-2">
                <img src={appStoreIcon} alt="App Store" className="size-6 rounded-md select-none" draggable={false} />
                <img src={playStoreIcon} alt="Google Play" className="size-6 rounded-md select-none" draggable={false} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
