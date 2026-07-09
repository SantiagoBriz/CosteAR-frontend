import { Globe, Monitor, Smartphone } from 'lucide-react';
import appStoreIcon from '@/assets/appstore_icon.png';
import playStoreIcon from '@/assets/playstore_icon.png';
import appleLogo from '@/assets/apple_logo.png';
import linuxTux from '@/assets/linux_tux.png';

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
    <img src={appleLogo} alt="macOS" className="size-5 object-contain" draggable={false} />
  );
}

function LinuxIcon() {
  return (
    <img src={linuxTux} alt="Linux" className="size-4 object-contain" draggable={false} />
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
