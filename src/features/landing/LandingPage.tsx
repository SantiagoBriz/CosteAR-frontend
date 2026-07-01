import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import {
  Calculator, TrendingUp, ShieldCheck, ArrowRight,
  Sparkles, FileText, ChevronRight, Menu, X, BarChart3, HelpCircle
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';


export function LandingPage() {
  const { accessToken, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

  // Sliders reactivos para el simulador de margen de la landing
  const [rawMaterial, setRawMaterial] = useState(2500);
  const [directLabor, setDirectLabor] = useState(3200);
  const [indirectCosts, setIndirectCosts] = useState(1800);
  const [targetMargin, setTargetMargin] = useState(30);

  // Cálculos automáticos del simulador
  const productionCost = rawMaterial + directLabor + indirectCosts;
  const targetMarginFrac = targetMargin / 100;
  const suggestedPrice = targetMarginFrac < 1 ? productionCost / (1 - targetMarginFrac) : productionCost;
  const netProfit = suggestedPrice - productionCost;

  const faqs = [
    {
      q: '¿Cómo funciona la extracción automática por IA?',
      a: 'Es muy sencillo. Tus operarios cargan una foto o un mensaje de texto con los datos de un gasto (por ejemplo, remito de materia prima, liquidación de haberes o factura de servicios). La IA clasifica la sección de costos correspondiente y extrae los datos clave listos para tu validación y populado con un solo click.'
    },
    {
      q: '¿Qué método utiliza para la valuación de stock?',
      a: 'CosteAR implementa de forma rigurosa la metodología de Precio Promedio Ponderado (PPP) y el modelo de Lote Óptimo de Wilson para la reposición eficiente de materias primas.'
    },
    {
      q: '¿Cómo se distribuyen los costos indirectos (CIF)?',
      a: 'El motor calcula automáticamente el prorrateo primario y secundario (dual-rate segregando fijos y variables) para transferir los costos acumulados de los departamentos de servicio a los productivos y derivar cuotas presupuestadas exactas.'
    },
    {
      q: '¿Los operarios tienen acceso a mis datos confidenciales?',
      a: 'No. Los operarios acceden a un portal simplificado y restringido que solo les permite reportar nuevos gastos o adjuntar comprobantes. Solo tú como costista administrador tienes acceso a las planillas de cálculo, márgenes e historial financiero.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-granate selection:text-white overflow-x-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 size-[500px] rounded-full bg-granate/10 blur-[130px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/3 right-10 size-[450px] rounded-full bg-red-950/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 size-[600px] rounded-full bg-granate/5 blur-[150px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-zinc-950/75 backdrop-blur-md border-b border-zinc-900/80">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-granate text-sm font-bold text-white shadow-lg shadow-granate/20">
              C
            </div>
            <span className="text-xl font-bold tracking-tight text-white">CosteAR</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#simulator" className="hover:text-white transition-colors">Simulador</a>
            <a href="#faqs" className="hover:text-white transition-colors">Preguntas</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {accessToken ? (
              <Link
                to={user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard'}
                className="inline-flex items-center gap-2 rounded-lg bg-granate hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-granate/25 transition-all"
              >
                Ir al Panel <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-100 transition-all"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-950/95 border-b border-zinc-900 px-6 py-5 space-y-4 animate-fade-in">
            <nav className="flex flex-col gap-3 text-sm font-medium text-zinc-400">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Funcionalidades</a>
              <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Simulador</a>
              <a href="#faqs" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-1">Preguntas</a>
            </nav>
            <hr className="border-zinc-900" />
            <div className="flex flex-col gap-3 pt-2">
              {accessToken ? (
                <Link
                  to={user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-granate hover:bg-red-700 py-2.5 text-sm font-semibold text-white shadow-md"
                >
                  Ir al Panel <ArrowRight className="size-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 text-sm font-semibold text-zinc-400 hover:text-white"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 py-2.5 text-sm font-semibold text-zinc-100"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 text-center md:pt-32 md:pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-granate/30 bg-granate/10 px-4 py-1.5 text-xs font-semibold text-granate-soft mb-6 animate-pulse">
          <Sparkles className="size-3 text-granate" /> Inteligencia Artificial aplicada a Costos
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-tight">
          El motor de costos para consultores y <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-granate to-pink-500">PyMEs argentinas</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
          Procesamiento automático de comprobantes, mano de obra y costos indirectos con prorrateo dual. Adaptado rigurosamente al modelo académico de cátedra.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={accessToken ? (user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard') : '/login'}
            className="inline-flex items-center gap-2 rounded-xl bg-granate hover:bg-red-700 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-granate/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            Iniciar Sesión <ArrowRight className="size-4" />
          </Link>
          <a
            href="#simulator"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-6 py-3.5 text-sm font-semibold text-zinc-200 hover:-translate-y-0.5 transition-all duration-200"
          >
            Probar simulador
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-zinc-950 py-20 border-y border-zinc-900/60 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Diseñado para automatizar cada elemento del costo
            </h2>
            <p className="mt-4 text-sm text-zinc-400">
              Menos tiempo cargando datos en Excel y mayor control del margen operativo de tus empresas.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative group rounded-2xl border border-zinc-900 bg-zinc-950 p-6 hover:border-granate/50 transition-all duration-300 hover:shadow-xl hover:shadow-granate/5">
              <div className="size-10 rounded-lg bg-granate/10 flex items-center justify-center text-granate mb-5 group-hover:scale-110 transition-transform">
                <FileText className="size-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Clasificación IA</h3>
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Los operarios envían comprobantes o mensajes. El clasificador IA detecta la sección de costos y extrae los datos de compra o consumo automáticamente.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-zinc-900 bg-zinc-950 p-6 hover:border-granate/50 transition-all duration-300 hover:shadow-xl hover:shadow-granate/5">
              <div className="size-10 rounded-lg bg-granate/10 flex items-center justify-center text-granate mb-5 group-hover:scale-110 transition-transform">
                <Calculator className="size-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Prorrateo Dual Completo</h3>
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Distribución primaria y prorrateo secundario separando componentes fijos y variables. Deriva automáticamente las cuotas CIF presupuestadas.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-zinc-900 bg-zinc-950 p-6 hover:border-granate/50 transition-all duration-300 hover:shadow-xl hover:shadow-granate/5">
              <div className="size-10 rounded-lg bg-granate/10 flex items-center justify-center text-granate mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="size-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Ficha de Stock PPP</h3>
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Valuación automática del consumo de materia prima por el método de Precio Promedio Ponderado. Alertas inteligentes de stock mínimo y punto de pedido.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-zinc-900 bg-zinc-950 p-6 hover:border-granate/50 transition-all duration-300 hover:shadow-xl hover:shadow-granate/5">
              <div className="size-10 rounded-lg bg-granate/10 flex items-center justify-center text-granate mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Cargas Sociales (ITCS)</h3>
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Cálculo de cargas sociales ciertas (derivaciones base, ART fija, SAC) e inciertas remunerativas y no remunerativas (IAP, PAP, PPP) de alta precisión.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section id="simulator" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-granate/10 px-3 py-1 text-xs font-semibold text-granate">
              <BarChart3 className="size-3.5" /> Simulador en vivo
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Probar el simulador de margen y punto de equilibrio
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Modificá las variables de los tres elementos del costo y definí el margen bruto deseado para ver en tiempo real el precio de venta unitario sugerido y la rentabilidad esperada del producto.
            </p>

            <div className="space-y-4 pt-2">
              {/* Materia Prima */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Elemento 1: Materia Prima (Wilson + PPP)</span>
                  <span className="text-white">{formatMoney(rawMaterial)}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="15000"
                  step="100"
                  value={rawMaterial}
                  onChange={(e) => setRawMaterial(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-granate"
                />
              </div>

              {/* Mano de Obra */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Elemento 2: Mano de Obra Directa (Con ITCS)</span>
                  <span className="text-white">{formatMoney(directLabor)}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="200"
                  value={directLabor}
                  onChange={(e) => setDirectLabor(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-granate"
                />
              </div>

              {/* Costos Indirectos */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Elemento 3: Costos Indirectos (CIF Prorrateados)</span>
                  <span className="text-white">{formatMoney(indirectCosts)}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="100"
                  value={indirectCosts}
                  onChange={(e) => setIndirectCosts(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-granate"
                />
              </div>

              {/* Margen objetivo */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Margen bruto objetivo (%)</span>
                  <span className="text-granate font-bold">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-granate"
                />
              </div>
            </div>
          </div>

          {/* Cost Card output */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-zinc-950">
            <div className="absolute top-0 right-0 w-24 h-24 bg-granate/10 blur-2xl rounded-full" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 pb-3 border-b border-zinc-800/80 flex items-center justify-between">
              <span>Estado de Costos Simulado</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase">Hoja 4</span>
            </h3>

            <div className="space-y-4 text-sm font-mono">
              <div className="flex justify-between pb-2 border-b border-zinc-900">
                <span className="text-zinc-400">1. Materia Prima Consumida</span>
                <span className="text-zinc-100">{formatMoney(rawMaterial)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-zinc-900">
                <span className="text-zinc-400">2. Mano de Obra Directa</span>
                <span className="text-zinc-100">(+) {formatMoney(directLabor)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-zinc-900">
                <span className="text-zinc-400">3. CIP Prorrateados / Aplicados</span>
                <span className="text-zinc-100">(+) {formatMoney(indirectCosts)}</span>
              </div>
              <div className="flex justify-between bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
                <span className="font-bold text-white">4. Costo de Producción</span>
                <span className="font-bold text-white">{formatMoney(productionCost)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-zinc-900 pt-2">
                <span className="text-zinc-400">Margen bruto establecido</span>
                <span className="text-ok font-bold">+{targetMargin}%</span>
              </div>
              <div className="flex justify-between bg-granate/5 p-4 rounded-xl border border-granate/20 mt-4">
                <div>
                  <span className="block text-[10px] font-sans font-semibold text-granate-soft uppercase tracking-wider">Precio Sugerido Venta</span>
                  <span className="text-2xl font-extrabold text-white">{formatMoney(suggestedPrice)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-sans font-semibold text-zinc-500 uppercase tracking-wider">Ganancia Neta</span>
                  <span className="text-lg font-bold text-zinc-300">{formatMoney(netProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQS Section */}
      <section id="faqs" className="bg-zinc-950 py-20 border-t border-zinc-900/60 relative">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-granate/10 px-3 py-1 text-xs font-semibold text-granate mb-4">
              <HelpCircle className="size-3.5" /> FAQ
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-950/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveAccordion(activeAccordion === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-medium text-sm text-white hover:bg-zinc-900/30 transition-all focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`size-4 text-zinc-500 transition-transform ${activeAccordion === idx ? 'rotate-90 text-granate' : ''}`} />
                </button>
                {activeAccordion === idx && (
                  <div className="p-5 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900/40 bg-zinc-900/10">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer-ish Section */}
      <section className="bg-gradient-to-b from-zinc-950 to-zinc-900 border-t border-zinc-900 py-16 text-center">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">¿Listo para modernizar tu control de costos?</h2>
          <p className="mx-auto max-w-xl text-zinc-400 text-sm leading-relaxed">
            Unite a los consultores y administradores que ya automatizan sus reportes de PyMEs en CosteAR.
          </p>
          <div className="pt-2">
            <Link
              to={accessToken ? (user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard') : '/login'}
              className="inline-flex items-center gap-2 rounded-xl bg-granate hover:bg-red-700 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-granate/20 transition-all"
            >
              Comenzar Ahora <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 py-8 border-t border-zinc-800/40">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-md bg-granate text-[10px] font-bold text-white">
              C
            </div>
            <span className="font-semibold text-zinc-400">CosteAR</span>
          </div>
          <p>© {new Date().getFullYear()} CosteAR. Todos los derechos reservados. Consultoría de Costos Inteligente.</p>
        </div>
      </footer>
    </div>
  );
}
