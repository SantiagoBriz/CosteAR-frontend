export function FooterSection() {
  return (
    <footer className="border-t border-line/60 py-10 bg-surface">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-start gap-6 sm:gap-12 text-xs text-ink-soft">
        <span>CosteAR · 2026 · Hecho en Tucumán 🇦🇷</span>
        <div className="flex gap-6">
          <a href="https://wa.me/5493816580360" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">WhatsApp</a>
          <a href="mailto:proyectocostear@gmail.com" className="hover:text-ink transition-colors">Email</a>
          <a href="https://www.instagram.com/coste_ar" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Instagram</a>
        </div>
      </div>
    </footer>
  );
}
