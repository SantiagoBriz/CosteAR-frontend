import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import {
  ArrowRight, LogIn, DollarSign, AlertTriangle, Sparkles, Percent,
  GraduationCap, FileSpreadsheet, Building2, UploadCloud, Radar, BellRing,
} from 'lucide-react';
import { AccessGateModal } from './AccessGateModal';
import iPhoneFrame from '@/assets/iphone-frame.svg';

/* Inset de la pantalla real dentro del frame SVG (calculado desde su viewBox 1296x2592). */
const SCREEN_INSET = { top: '3.02%', right: '6.54%', bottom: '2.98%', left: '6.66%' };

export function LandingPage() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const [showGate, setShowGate] = useState(false);

  const handleAccessClick = () => {
    if (accessToken) {
      navigate({ to: user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard' });
    } else {
      setShowGate(true);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-ink antialiased selection:bg-granate selection:text-white">
      {/* --- HEADER --- */}
      <header className="relative z-40 border-b border-line/60 bg-surface">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <span className="text-lg font-bold tracking-tight text-ink">CosteAR</span>

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
            <a href="#features" className="transition-colors hover:text-ink">Características</a>
            <a href="#como-funciona" className="transition-colors hover:text-ink">Cómo funciona</a>
            <a href="mailto:proyectocostear@gmail.com" className="transition-colors hover:text-ink">Contacto</a>
          </nav>

          <button
            type="button"
            onClick={handleAccessClick}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink transition-all duration-200 hover:border-granate hover:text-granate"
          >
            {accessToken ? 'Ir al Panel' : 'Acceso Equipo'}
            <LogIn className="size-3.5" />
          </button>
        </div>
      </header>

      {/* --- HERO --- */}
      <section className="relative bg-surface pb-20 pt-16 lg:pt-20">
        {/* Máscara: apaga cualquier resto de color del destello a blanco puro ANTES de que termine la sección, para que nunca se vea un corte contra las cards de abajo.
            Sin z-index propio a propósito: así el teléfono (que viene después en el DOM) pinta encima donde se solapan, y la máscara solo se ve en el espacio vacío alrededor. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-surface via-surface/95 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-8">
          {/* --- Columna de texto --- */}
          <div className="relative z-10 text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-granate/15 bg-granate-tenue px-4 py-1.5 text-xs font-semibold text-granate">
              <GraduationCap className="size-3.5" />
              Aval académico · Cátedra de Costos, FCE — UNT
            </div>

            <p className="mb-2 text-sm italic text-ink-soft">Costeo profesional, sin fricción.</p>

            <h1 className="mx-auto max-w-xl text-5xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-6xl lg:mx-0">
              Tus estructuras de costos, siempre al día
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg lg:mx-0">
              Automatizá la actualización de tus costeos ante la inflación, el dólar y las paritarias.
              CosteAR sincroniza el BCRA y el INDEC en tiempo real y te avisa antes de que el margen de un cliente se te escape.
            </p>

            <div className="mt-10 flex items-center justify-center lg:justify-start">
              <button
                onClick={handleAccessClick}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-action px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-action/20 transition-all hover:bg-action-soft hover:shadow-xl"
              >
                {accessToken ? 'Ir al Panel' : 'Acceder al Panel'}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {/* --- Columna del mockup --- */}
          <div className="relative flex select-none items-center justify-center py-4" style={{ perspective: '1400px' }}>
            {/* Destello de luz difuminado, estilo "glow" — sin fondo bordó completo, y chico/contenido para que no llegue con color a la sección de abajo */}
            <div
              className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-[90px]"
              style={{ background: 'radial-gradient(circle, #d13042 0%, #b31929 20%, #e8925a 42%, transparent 60%)' }}
            />

            {/* Teléfono: silueta vectorial real de un iPhone (frame CC0), no dibujada a mano */}
            <div
              className="relative h-[580px] w-[290px] scale-[0.82] transition-all duration-300 sm:scale-100"
              style={{
                transform: 'rotateX(8deg) rotateY(-14deg) rotateZ(2deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Contenido de pantalla — vive DEBAJO del frame, recortado por el hueco real del SVG */}
              <div
                className="absolute overflow-hidden bg-[#0b0c10] text-left text-white"
                style={{
                  ...SCREEN_INSET,
                  borderRadius: '15px',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 2px 4px rgba(0,0,0,0.6)',
                }}
              >
                <div className="flex h-full w-full flex-col px-3.5 pb-3 pt-7">
                  <div className="absolute left-3.5 right-3.5 top-2 flex justify-between text-[8px] font-semibold text-zinc-400">
                    <span className="font-mono">9:41</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span>5G</span>
                      <div className="flex h-1.5 w-4 items-center rounded-xs border border-zinc-500 p-0.5">
                        <div className="h-full w-full rounded-xs bg-zinc-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                      <span className="text-xs font-bold text-white">CosteAR</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[8px] font-medium text-zinc-400">Metalúrgica</span>
                    </div>

                    <div className="space-y-1 rounded-lg border border-red-950 border-l-2 border-l-red-500 bg-red-950/20 p-3">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-red-400">
                        <AlertTriangle className="size-3" />
                        ALERTA DE MARGEN
                      </div>
                      <p className="text-[10px] leading-snug text-zinc-300">
                        La paritaria UOM reducirá el margen al <strong>12%</strong>.
                      </p>
                    </div>

                    {/* Foco principal: margen bruto en grande, sin planilla apretada al lado */}
                    <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Margen Bruto</span>
                      <div className="mt-2 flex items-end justify-between">
                        <span className="font-mono text-2xl font-bold text-white">$1.050.000</span>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-400">
                          34.2%
                        </span>
                      </div>
                      <div className="mt-4 border-t border-zinc-800/60 pt-3 font-mono text-[9px] text-zinc-500">
                        Costo Total Prod. <span className="text-zinc-300">$2.018.750</span>
                      </div>
                    </div>

                    <div className="mt-auto rounded-lg border border-granate/20 bg-granate-deep/35 p-2.5 text-[9px] leading-snug text-zinc-300">
                      <span className="mb-0.5 block font-bold text-[#e0919b]">Sugerencia IA</span>
                      Aumentá el precio un 4.5% para mantener el margen.
                    </div>
                  </div>
                </div>
              </div>

              {/* Reflejo de vidrio sutil sobre la pantalla */}
              <div
                className="pointer-events-none absolute"
                style={{ ...SCREEN_INSET, borderRadius: '15px', background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 35%)' }}
              />

              {/* Frame real del iPhone: la silueta vectorial CC0 se usa como máscara (su alpha),
                  y encima se pinta un degradé metálico propio con luces y sombras — así la forma
                  es 100% real y la profundidad 3D la controlamos nosotros, no queda plana. */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  WebkitMaskImage: `url(${iPhoneFrame})`,
                  maskImage: `url(${iPhoneFrame})`,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  background:
                    'linear-gradient(122deg, #f2f2f4 0%, #c7c7cc 5%, #838388 11%, #3a3a3d 19%, #161617 30%, #0a0a0b 46%, #1c1c1e 58%, #313134 70%, #0a0a0b 84%, #48484c 94%, #d8d8db 100%)',
                  filter: 'drop-shadow(0 45px 80px rgba(74,21,27,0.4)) drop-shadow(0 20px 38px rgba(0,0,0,0.35))',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- MÉTRICAS FLOTANTES --- */}
      <section className="relative z-30 bg-surface">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-2 justify-center gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-line bg-surface px-5 py-4 text-center shadow-md">
              <span className="block font-mono text-2xl font-bold text-granate">34%</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">Margen Bruto</span>
            </div>
            <div className="rounded-lg border border-line bg-surface px-5 py-4 text-center shadow-md">
              <span className="block font-mono text-2xl font-bold text-ink">90%</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">Tiempo Ahorrado</span>
            </div>
            <div className="rounded-lg border border-line bg-surface px-5 py-4 text-center shadow-md">
              <span className="block font-mono text-2xl font-bold text-granate">924</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">Dólar BCRA</span>
            </div>
            <div className="rounded-lg border border-line bg-surface px-5 py-4 text-center shadow-md">
              <span className="block font-mono text-2xl font-bold text-ink">4.2%</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-ink-soft/70">IPC INDEC</span>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-lg text-center text-xs italic leading-relaxed text-ink-soft">
            Metodología validada por la Cátedra de Costos, Facultad de Ciencias Económicas — Universidad Nacional de Tucumán.
          </p>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-granate">Cómo te cuida CosteAR</p>
          <h2 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Todo lo que un costista necesita, en un solo lugar
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Pensado para quienes gestionan varias PyMEs a la vez y no tienen tiempo que perder actualizando planillas a mano.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Card 1: Materia Prima */}
          <div className="flex flex-col justify-between rounded-lg border border-line bg-surface-alt p-8 shadow-xs transition-all hover:border-line-strong">
            <div className="space-y-3">
              <span className="rounded-full border border-granate/20 bg-granate/10 px-3 py-1 text-[10px] font-bold text-granate">
                PPP + LOTE ÓPTIMO
              </span>
              <h3 className="text-xl font-bold text-ink">Gestión de Materia Prima</h3>
              <p className="text-xs leading-relaxed text-ink-soft">
                Seguimiento de compras y consumos con el método del Precio Promedio Ponderado, más el indicador de lote óptimo de reposición según la fórmula de Wilson.
              </p>
            </div>

            <div className="animate-rise relative mt-8 overflow-hidden rounded-md border border-line bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
                <span className="text-[11px] font-bold text-ink">Fórmula de Wilson</span>
                <span className="font-mono text-[9px] text-ink-soft/60">Noviembre 2026</span>
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between text-ink-soft">
                  <span>Demanda Anual (R):</span>
                  <span className="font-mono font-semibold text-ink">15.000 u</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Costo Unitario (C):</span>
                  <span className="font-mono font-semibold text-ink">$1.200</span>
                </div>
                <div className="flex items-center justify-between rounded-sm border border-granate/10 bg-granate/5 p-2 font-bold text-ink">
                  <span className="text-granate">Lote Óptimo de Compra:</span>
                  <span className="font-mono text-xs text-granate">836 u</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Monitoreo Macro */}
          <div className="flex flex-col justify-between rounded-lg border border-line bg-surface-alt p-8 shadow-xs transition-all hover:border-line-strong">
            <div className="space-y-3">
              <span className="rounded-full border border-granate/20 bg-granate/10 px-3 py-1 text-[10px] font-bold text-granate">
                INTEGRACIÓN API BCRA/INDEC
              </span>
              <h3 className="text-xl font-bold text-ink">Monitoreo Macroeconómico</h3>
              <p className="text-xs leading-relaxed text-ink-soft">
                Tu estructura de costos conectada en tiempo real a las cotizaciones del BCRA y a los índices de inflación del INDEC.
              </p>
            </div>

            <div className="mt-8 flex justify-center" style={{ perspective: '800px' }}>
              <div
                className="relative h-[190px] w-[185px] rounded-t-[32px] border-x-2 border-t-2 border-zinc-700/80 bg-black p-2 shadow-lg"
                style={{ transform: 'rotateX(15deg) rotateY(-10deg) rotateZ(3deg)', transformStyle: 'preserve-3d' }}
              >
                <div className="absolute left-1/2 top-2 z-30 h-3.5 w-16 -translate-x-1/2 rounded-full bg-black" />
                <div className="h-full w-full overflow-hidden rounded-t-[24px] bg-[#0d0e12] px-3 pt-7 text-left">
                  <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-wider text-zinc-500">Indicadores Oficiales</span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-sm border border-zinc-800 bg-zinc-900/60 p-1.5">
                      <div className="flex items-center gap-1">
                        <DollarSign className="size-3 text-emerald-400" />
                        <span className="font-mono text-[9px] font-bold text-white">$924</span>
                      </div>
                      <span className="text-[7px] text-zinc-500">Dólar BCRA</span>
                    </div>
                    <div className="flex items-center justify-between rounded-sm border border-zinc-800 bg-zinc-900/60 p-1.5">
                      <div className="flex items-center gap-1">
                        <Percent className="size-2.5 text-amber-500" />
                        <span className="font-mono text-[9px] font-bold text-white">+4.2%</span>
                      </div>
                      <span className="text-[7px] text-zinc-500">IPC Nacional</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini features (3 columnas) */}
        <div className="mx-auto mt-8 grid max-w-5xl gap-8 border-t border-line pt-12 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="flex size-9 items-center justify-center rounded-sm bg-granate/10 text-granate">
              <BellRing className="size-4" />
            </div>
            <h4 className="text-sm font-bold text-ink">Alertas de Margen</h4>
            <p className="text-xs leading-relaxed text-ink-soft">
              Te avisamos apenas una paritaria o una devaluación amenaza el margen de un cliente, antes de que sea tarde.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex size-9 items-center justify-center rounded-sm bg-granate/10 text-granate">
              <FileSpreadsheet className="size-4" />
            </div>
            <h4 className="text-sm font-bold text-ink">Exportá a Excel</h4>
            <p className="text-xs leading-relaxed text-ink-soft">
              Descargá tu estructura completa en un Excel de 5 hojas, con la identidad de CosteAR, listo para presentar.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex size-9 items-center justify-center rounded-sm bg-granate/10 text-granate">
              <Building2 className="size-4" />
            </div>
            <h4 className="text-sm font-bold text-ink">Multi-empresa</h4>
            <p className="text-xs leading-relaxed text-ink-soft">
              Administrá el costeo de todas tus PyMEs desde un mismo panel, sin mezclar planillas ni perder el hilo.
            </p>
          </div>
        </div>
      </section>

      {/* --- CÓMO FUNCIONA --- */}
      <section id="como-funciona" className="bg-surface-alt py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-granate">Puesta en marcha</p>
            <h2 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              De tu Excel al panel, en tres pasos
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface p-6 shadow-xs">
              <div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-granate/10 text-granate">
                <UploadCloud className="size-5" />
              </div>
              <span className="mb-1 block font-mono text-xs font-bold text-granate">01</span>
              <h3 className="mb-1.5 text-sm font-bold text-ink">Cargá tu estructura</h3>
              <p className="text-xs leading-relaxed text-ink-soft">
                Subís los datos de tu Excel de costos (materia prima, mano de obra, carga fabril) una sola vez.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface p-6 shadow-xs">
              <div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-granate/10 text-granate">
                <Radar className="size-5" />
              </div>
              <span className="mb-1 block font-mono text-xs font-bold text-granate">02</span>
              <h3 className="mb-1.5 text-sm font-bold text-ink">Sincronizamos los datos macro</h3>
              <p className="text-xs leading-relaxed text-ink-soft">
                Actualizamos el dólar BCRA y el IPC INDEC de forma automática, todos los días.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface p-6 shadow-xs">
              <div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-granate/10 text-granate">
                <Sparkles className="size-5" />
              </div>
              <span className="mb-1 block font-mono text-xs font-bold text-granate">03</span>
              <h3 className="mb-1.5 text-sm font-bold text-ink">Recibís alertas y sugerencias</h3>
              <p className="text-xs leading-relaxed text-ink-soft">
                Te avisamos cuando el margen baja del umbral y te sugerimos el ajuste de precio necesario.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="relative mx-auto my-16 max-w-5xl overflow-hidden rounded-xl border border-granate/10 bg-gradient-to-tr from-granate-deep via-granate to-granate-deep px-6 py-20 text-center text-white shadow-xl">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[80px]" />
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Protegé la rentabilidad de tu cartera hoy mismo
          </h2>
          <p className="mx-auto max-w-xl text-sm text-zinc-300">
            Comenzá a modelar tus estructuras con el motor automatizado. Conectá tus clientes, automatizá la carga de facturas y dejá que el sistema monitoree tus márgenes.
          </p>
          <button
            onClick={handleAccessClick}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-granate shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl"
          >
            Acceder al Panel de Equipo <ArrowRight className="size-4 text-granate" />
          </button>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-line bg-surface py-8 text-center">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-ink-soft/70 sm:flex-row">
          <span>CosteAR · 2026 · Hecho en Tucumán 🇦🇷</span>
          <div className="flex gap-4">
            <a href="https://wa.me/5493816580360" target="_blank" rel="noreferrer" className="transition-colors hover:text-granate">WhatsApp</a>
            <a href="mailto:proyectocostear@gmail.com" className="transition-colors hover:text-granate">Email</a>
            <a href="https://www.instagram.com/coste_ar" target="_blank" rel="noreferrer" className="transition-colors hover:text-granate">Instagram</a>
          </div>
        </div>
      </footer>

      {showGate && (
        <AccessGateModal
          onClose={() => setShowGate(false)}
          onSuccess={() => navigate({ to: '/login' })}
        />
      )}
    </div>
  );
}
