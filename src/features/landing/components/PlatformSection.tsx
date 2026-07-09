import { Globe, Monitor, Smartphone } from 'lucide-react';

// SVG logos inline para App Store y Play Store
function AppStoreBadge() {
  return (
    <svg viewBox="0 0 120 40" className="h-9 w-auto" aria-label="Descargar en App Store">
      <rect width="120" height="40" rx="8" fill="#111215"/>
      <text x="34" y="13" fontFamily="system-ui,sans-serif" fontSize="7" fill="#fff" opacity="0.75">Disponible en el</text>
      <text x="29" y="28" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="700" fill="#fff">App Store</text>
      {/* Apple logo */}
      <path d="M13 19.5c0-3.3 2.7-4.9 2.8-5-1.5-2.2-3.9-2.5-4.7-2.5-2 0-3.9 1.2-4.9 1.2-1 0-2.6-1.1-4.3-1.1C-.2 12.1-3 14.1-3 18.5c0 2.7 1 5.5 2.3 7.3.6.9 1.4 1.9 2.4 1.9 1 0 1.3-.6 2.5-.6 1.2 0 1.6.6 2.6.6 1 0 1.7-.9 2.3-1.8.7-1 1-2 1-2s-2-.8-2-3.4zm-3-11.3c.5-.6.9-1.5.8-2.4-.8 0-1.8.6-2.4 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.9-.4 2.4-1.1z" transform="translate(7,8) scale(0.85)" fill="#fff"/>
    </svg>
  );
}

function PlayStoreBadge() {
  return (
    <svg viewBox="0 0 135 40" className="h-9 w-auto" aria-label="Disponible en Google Play">
      <rect width="135" height="40" rx="8" fill="#111215"/>
      <text x="38" y="13" fontFamily="system-ui,sans-serif" fontSize="7" fill="#fff" opacity="0.75">Disponible en</text>
      <text x="34" y="28" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="700" fill="#fff">Google Play</text>
      {/* Play triangle coloreado */}
      <g transform="translate(12,10)">
        <path d="M1 1.5L12 10 1 18.5V1.5z" fill="#4CAF50"/>
        <path d="M1 1.5l7 8.5-7 8.5L12 10z" fill="#F44336" opacity="0"/>
        <path d="M1 1.5l11 8.5H1z" fill="#FFD600" opacity="0.85"/>
        <path d="M1 10h11l-11 8.5z" fill="#4FC3F7" opacity="0.85"/>
        <polygon points="1,1.5 12,10 1,18.5" fill="url(#pg)"/>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD600"/>
            <stop offset="50%" stopColor="#4CAF50"/>
            <stop offset="100%" stopColor="#4FC3F7"/>
          </linearGradient>
        </defs>
      </g>
    </svg>
  );
}

// Iconos de OS para desktop
function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-ink-soft" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.801"/>
    </svg>
  );
}
function MacIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-ink-soft" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c4.411 0 8 3.589 8 8 0 1.504-.42 2.91-1.144 4.113L7.887 5.144A7.96 7.96 0 0 1 12 4zm0 16c-4.411 0-8-3.589-8-8 0-1.504.42-2.91 1.144-4.113l10.969 10.969A7.96 7.96 0 0 1 12 20z"/>
    </svg>
  );
}
function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-ink-soft" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.567 1.563 1.182 2.114.623.567 1.41.768 2.147.851.74.086 1.478.061 2.083.034.61-.028 1.102-.051 1.418-.038.376.013.67.116.956.308.282.19.537.465.808.756.27.292.56.604.878.842.318.238.674.417 1.109.417.435 0 .791-.179 1.109-.417.318-.238.608-.55.878-.842.27-.291.526-.566.808-.756.286-.192.58-.295.956-.308.316-.013.808.01 1.418.038.605.027 1.343.052 2.083-.034.738-.083 1.524-.284 2.147-.851.616-.551 1.065-1.335 1.182-2.114.124-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.49 1.055-5.965-3.17-6.298-.166-.013-.326-.021-.48-.021zm-4.95 4.8c.16-.97.606-1.792 1.413-2.26C9.727 2.1 10.81 2 12 2c1.19 0 2.273.1 3.033.54.807.468 1.253 1.29 1.413 2.26.317 1.923-.195 4.428-1.253 5.9-.668.925-.94 1.817-.94 2.88v.42c0 .278-.026.555-.079.83-.226 1.199-.944 2.264-2.017 2.752-.216.097-.444.158-.677.158-.233 0-.461-.061-.677-.158-1.073-.488-1.791-1.553-2.017-2.752-.053-.275-.079-.552-.079-.83v-.42c0-1.063-.272-1.955-.94-2.88C4.749 9.228 4.237 6.723 4.554 4.8z"/>
    </svg>
  );
}

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
          <div className="group relative rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all duration-300 hover:border-granate/20 hover:shadow-md">
            <div className="flex justify-between items-start mb-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Globe className="size-5" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Disponible
              </span>
            </div>
            <h4 className="text-sm font-bold text-ink mb-1">Web App</h4>
            <p className="text-[11px] leading-relaxed text-ink-soft">
              Desde cualquier navegador, sin instalación. Solo abrís y trabajás.
            </p>
          </div>

          {/* Desktop */}
          <div className="group relative rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all duration-300 hover:border-granate/20 hover:shadow-md">
            <div className="flex justify-between items-start mb-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Monitor className="size-5" />
              </div>
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                Muy pronto
              </span>
            </div>
            <h4 className="text-sm font-bold text-ink mb-3">Escritorio</h4>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <WindowsIcon />
                <span className="text-[9px] text-ink-soft font-semibold">Windows</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <MacIcon />
                <span className="text-[9px] text-ink-soft font-semibold">macOS</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <LinuxIcon />
                <span className="text-[9px] text-ink-soft font-semibold">Linux</span>
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="group relative rounded-2xl border border-line bg-surface p-6 shadow-xs transition-all duration-300 hover:border-granate/20 hover:shadow-md">
            <div className="flex justify-between items-start mb-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Smartphone className="size-5" />
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                Próximamente
              </span>
            </div>
            <h4 className="text-sm font-bold text-ink mb-3">Mobile</h4>
            <div className="flex flex-col gap-2">
              <AppStoreBadge />
              <PlayStoreBadge />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
