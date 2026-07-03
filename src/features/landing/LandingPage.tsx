import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { ArrowRight, LogIn } from 'lucide-react';
import { AccessGateModal } from './AccessGateModal';

export function LandingPage() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const [showGate, setShowGate] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Configuración de la landing (equivalente a las props del Devcard)
  const P = {
    phrase: 'A',
    targetDate: '2026-08-13T09:00:00-03:00',
    glow: '#50101A'
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer:fine)').matches;

    if (P.glow) root.style.setProperty('--granate', P.glow);

    // 1. Isotipo "ecualizador": C de barras horizontales
    const buildLogo = (el: HTMLElement) => {
      const mark = el.querySelector('#logoMark');
      if (!mark) return;
      mark.innerHTML = ''; // Limpiar previo
      const ns = 'http://www.w3.org/2000/svg';
      const W = 210, H = 200, cx = 105, cy = 100, Ro = 86, Ri = 45, step = 7, barH = 3, mouthH = 22;
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.overflow = 'visible';

      const segs: [number, number, number, number][] = [];
      for (let y = cy - Ro + barH; y <= cy + Ro - barH; y += step) {
        const dy = y - cy, ady = Math.abs(dy);
        if (ady >= Ro) continue;
        const xo = Math.sqrt(Ro * Ro - dy * dy);
        if (ady >= Ri) {
          segs.push([cx - xo, cx + xo, y, ady]);
        } else {
          const xi = Math.sqrt(Ri * Ri - dy * dy);
          segs.push([cx - xo, cx - xi, y, ady]); // izquierda (espina)
          if (ady >= mouthH) segs.push([cx + xi, cx + xo, y, ady]); // derecha salvo la boca
        }
      }

      const bars: { el: SVGElement; ady: number }[] = [];
      segs.forEach(([x1, x2, y, ady]) => {
        const r = document.createElementNS(ns, 'rect');
        const w = Math.max(2.4, x2 - x1);
        r.setAttribute('x', x1.toFixed(1));
        r.setAttribute('y', (y - barH / 2).toFixed(1));
        r.setAttribute('width', w.toFixed(1));
        r.setAttribute('height', barH.toString());
        r.setAttribute('rx', (barH / 2).toFixed(1));
        r.setAttribute('fill', 'currentColor');
        r.style.transformBox = 'fill-box';
        r.style.transformOrigin = 'center';
        bars.push({ el: r, ady });
        svg.appendChild(r);
      });
      mark.appendChild(svg);

      if (!document.getElementById('eqPulseKF')) {
        const st = document.createElement('style');
        st.id = 'eqPulseKF';
        st.textContent = '@keyframes eqPulseBar{0%{transform:scaleX(.80)}100%{transform:scaleX(1)}}';
        document.head.appendChild(st);
      }

      const maxAdy = Ro;
      bars.forEach((b) => {
        if (reduce) {
          b.el.style.opacity = '1';
          return;
        }
        const dur = (2.4 + Math.random() * 1.8).toFixed(2);
        const ph = (-(Math.random() * 4)).toFixed(2);
        b.el.style.animation = 'eqPulseBar ' + dur + 's ease-in-out ' + ph + 's infinite alternate';
        b.el.style.opacity = '0';
        b.el.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 460, delay: (b.ady / maxAdy) * 380 + 120, easing: 'ease-out', fill: 'forwards' }
        );
      });
    };

    // 2. Cosmos & Nebulae: Programmatic Canvas Drawing
    let cosmosResizeHandler: (() => void) | null = null;
    let animationFrameId: number | null = null;
    let cosmosCleanup: (() => void) | null = null;

    const buildCosmos = (el: HTMLElement) => {
      const canvas = el.querySelector('#cosmos') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rand = (a: number, b: number) => a + Math.random() * (b - a);

      interface Star {
        x: number;
        y: number;
        r: number;
        a: number;
        ph: number;
        sp: number;
      }
      const stars: Star[] = [];
      let W = 0, H = 0, DPR = 1;

      const gen = () => {
        W = window.innerWidth; H = window.innerHeight;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        stars.length = 0;
        const n = Math.round((W * H) / 10000);
        for (let i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: rand(0.5, 1.2),
            a: rand(0.2, 0.7),
            ph: Math.random() * Math.PI * 2,
            sp: rand(0.3, 0.8)
          });
        }
      };
      gen();
      cosmosResizeHandler = gen;
      window.addEventListener('resize', gen);

      // Programmatic glowing nebulae that drift slowly (no divs, no hard borders)
      const nebulae = [
        { x: W * 0.4, y: H * 0.5, targetX: W * 0.4, targetY: H * 0.5, r: 420, col: 'rgba(114, 18, 31, 0.16)', angle: 0, speed: 0.001 },
        { x: W * 0.6, y: H * 0.4, targetX: W * 0.6, targetY: H * 0.4, r: 350, col: 'rgba(162, 28, 47, 0.11)', angle: Math.PI, speed: 0.0008 },
        { x: W * 0.5, y: H * 0.6, targetX: W * 0.5, targetY: H * 0.6, r: 260, col: 'rgba(201, 162, 75, 0.03)', angle: Math.PI / 2, speed: 0.0012 }
      ];

      const start = performance.now();
      const draw = (now: number) => {
        const t = (now - start) / 1000;
        ctx.fillStyle = '#0B0607';
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = 'lighter';

        // 1. Draw Nebulae
        nebulae.forEach((neb) => {
          neb.angle += neb.speed;
          const dx = Math.sin(neb.angle) * 45;
          const dy = Math.cos(neb.angle) * 35;
          const cx = neb.targetX + dx;
          const cy = neb.targetY + dy;

          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, neb.r);
          g.addColorStop(0, neb.col);
          g.addColorStop(0.5, neb.col.replace(/[\d.]+\)$/, '0.04)'));
          g.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, neb.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // 2. Draw Twinkling Stars
        stars.forEach((s) => {
          const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
          ctx.fillStyle = 'rgba(255, 255, 255,' + (s.a * tw) + ')';
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.globalCompositeOperation = 'source-over';
        animationFrameId = requestAnimationFrame(draw);
      };
      animationFrameId = requestAnimationFrame(draw);
    };

    // 3. Frase central: swap A/B/C
    const maybeSwapPhrase = (el: HTMLElement) => {
      const variant = P.phrase || 'A';
      if (variant === 'A') return;
      const map: Record<string, [string, boolean?, boolean?][]> = {
        B: [['El'], ['futuro', true], ['de'], ['tus'], ['costos,'], ['a'], ['punto', false, true], ['de'], ['empezar.']],
        C: [['Falta'], ['muy'], ['poco'], ['para'], ['cambiarlo', true], ['todo.']]
      };
      const tokens = map[variant];
      if (!tokens) return;
      const hEl = el.querySelector('#phraseWords');
      if (!hEl) return;
      hEl.innerHTML = '';
      tokens.forEach((tk, i) => {
        const [word, tech, ital] = tk;
        const s = document.createElement('span');
        s.textContent = word;
        let css = 'display:inline-block;animation:wordIn .6s cubic-bezier(0.16,1,0.3,1) both;animation-delay:' + (0.9 + i * 0.09).toFixed(2) + 's;';
        if (tech) css += "font-family:'Space Grotesk',sans-serif;font-weight:700;text-transform:uppercase;font-size:.86em;background:linear-gradient(120deg,var(--accent-a),var(--accent-b));-webkit-background-clip:text;background-clip:text;color:transparent;";
        if (ital) css += 'font-style:italic;font-weight:500;';
        s.style.cssText = css;
        hEl.appendChild(s);
      });
    };

    // 4. Contador con flip por dígito
    let countdownTimer: any = null;
    const startCountdown = (el: HTMLElement) => {
      const TARGET = new Date(P.targetDate).getTime();
      const pad = (n: number) => String(n).padStart(2, '0');

      const counter = el.querySelector('#counter') as HTMLElement | null;
      const arrived = el.querySelector('#arrived') as HTMLElement | null;
      const label = el.querySelector('#cntLabel') as HTMLElement | null;

      const get = (u: string) => ({
        digs: el.querySelector('[data-unit="' + u + '"] .digs') as HTMLElement | null,
        fill: el.querySelector('[data-fill="' + u + '"]') as HTMLElement | null
      });
      const units = { days: get('days'), hours: get('hours'), minutes: get('minutes'), seconds: get('seconds') };

      const setDig = (slot: Element | null | undefined, ch: string) => {
        if (!slot || slot.textContent === ch) return;
        slot.textContent = ch;
        if (reduce || !slot.animate) return;
        slot.animate(
          [{ transform: 'translateY(-100%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 280, easing: 'cubic-bezier(0.16,1,0.3,1)' }
        );
      };
      const setUnit = (U: ReturnType<typeof get>, val: number, frac: number) => {
        if (U.digs) {
          const s = pad(val), slots = U.digs.querySelectorAll('.dig');
          setDig(slots[0], s[s.length - 2] || '0');
          setDig(slots[1], s[s.length - 1] || '0');
        }
        if (U.fill && frac != null) U.fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, frac)) + ')';
      };

      let daysMax: number | null = null;
      const tick = () => {
        let diff = TARGET - Date.now();
        if (diff <= 0) {
          if (counter) counter.style.display = 'none';
          if (label) label.style.display = 'none';
          if (arrived) arrived.style.display = 'flex';
          if (countdownTimer) clearInterval(countdownTimer);
          return;
        }
        const d = Math.floor(diff / 86400000); diff -= d * 86400000;
        const h = Math.floor(diff / 3600000); diff -= h * 3600000;
        const m = Math.floor(diff / 60000); diff -= m * 60000;
        const s = Math.floor(diff / 1000);
        if (daysMax == null) daysMax = Math.max(d, 1);
        setUnit(units.days, d, d / daysMax);
        setUnit(units.hours, h, h / 24);
        setUnit(units.minutes, m, m / 60);
        setUnit(units.seconds, s, s / 60);
      };
      tick();
      countdownTimer = setInterval(tick, 1000);
    };

    // 5. Card tilt parallax + magnetic buttons
    const startPointerFX = (el: HTMLElement) => {
      const tilt = el.querySelector('#tiltBlock') as HTMLElement | null;

      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let cnx = 0, cny = 0;

      const onMove = (e: MouseEvent) => {
        mx = e.clientX; my = e.clientY;
      };
      window.addEventListener('mousemove', onMove);

      let pointerRafId: number | null = null;
      const loop = () => {
        const nx = (mx / window.innerWidth) * 2 - 1;
        const ny = (my / window.innerHeight) * 2 - 1;
        cnx += (nx - cnx) * 0.08;
        cny += (ny - cny) * 0.08;
        if (tilt) tilt.style.transform = 'rotateY(' + (cnx * 3.2) + 'deg) rotateX(' + (-cny * 3.2) + 'deg)';

        pointerRafId = requestAnimationFrame(loop);
      };
      pointerRafId = requestAnimationFrame(loop);

      // Botones magnéticos
      const mags = el.querySelectorAll('.magnetic');
      const magHandlers: [Element, (e: any) => void, () => void, () => void][] = [];
      mags.forEach((btn: any) => {
        const onEnterMove = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          btn.style.transform = 'translate(' + Math.max(-6, Math.min(6, dx * 0.3)) + 'px,' + Math.max(-6, Math.min(6, dy * 0.3)) + 'px) scale(1.05)';
        };
        const onLeave = () => { btn.style.transform = ''; };
        const onDown = () => { btn.style.transform = 'scale(0.97)'; };
        btn.style.transition = 'transform .2s cubic-bezier(0.16,1,0.3,1), box-shadow .2s ease, border-color .2s ease, background .2s ease';
        btn.addEventListener('mousemove', onEnterMove);
        btn.addEventListener('mouseleave', onLeave);
        btn.addEventListener('mousedown', onDown);
        btn.addEventListener('mouseup', onEnterMove);
        magHandlers.push([btn, onEnterMove, onLeave, onDown]);
      });

      cosmosCleanup = () => {
        window.removeEventListener('mousemove', onMove);
        if (pointerRafId) cancelAnimationFrame(pointerRafId);
        magHandlers.forEach(([b, mv, lv, dn]) => {
          b.removeEventListener('mousemove', mv);
          b.removeEventListener('mouseleave', lv);
          b.removeEventListener('mousedown', dn);
          b.removeEventListener('mouseup', mv);
        });
      };
    };

    buildLogo(root);
    buildCosmos(root);
    maybeSwapPhrase(root);
    startCountdown(root);
    if (fine && !reduce) startPointerFX(root);

    // Wordmark reveal animation
    const wm = root.querySelector('#wordmark') as HTMLElement | null;
    if (wm) {
      if (reduce) {
        wm.style.opacity = '1';
      } else {
        wm.animate(
          [{ opacity: 0, letterSpacing: '0.62em' }, { opacity: 1, letterSpacing: '0.42em' }],
          { duration: 700, delay: 1100, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' }
        );
      }
    }

    return () => {
      if (countdownTimer) clearInterval(countdownTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (cosmosResizeHandler) window.removeEventListener('resize', cosmosResizeHandler);
      if (cosmosCleanup) cosmosCleanup();
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-granate selection:text-white select-none">
      {/* Cargar fuentes desde Google Fonts e inyectar animaciones clave del diseño de Claude */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=JetBrains+Mono:wght@500;700&display=swap');

        *{box-sizing:border-box}
        html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#0E0708;font-family:'Space Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
        @keyframes nebDrift1{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(calc(-50% + 36px),calc(-50% - 26px))}}
        @keyframes nebDrift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,24px)}}
        @keyframes nebDrift3{0%,100%{transform:translate(0,0)}50%{transform:translate(26px,30px)}}
        @keyframes nebIn{0%{opacity:0}100%{opacity:1}}
        @keyframes fadeUp{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes wordIn{0%{opacity:0;transform:translateY(20px);filter:blur(8px)}100%{opacity:1;transform:translateY(0);filter:blur(0)}}
        @keyframes cardIn{0%{opacity:0;transform:translateY(30px) scale(.92)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes ctaIn{0%{opacity:0;transform:translateY(22px)}62%{opacity:1;transform:translateY(-3px)}100%{transform:translateY(0)}}
        @keyframes glowBreath{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}}
        @keyframes logoGlow{0%,100%{opacity:.4;transform:translate(-50%,-50%) scale(1)}50%{opacity:.85;transform:translate(-50%,-50%) scale(1.08)}}
        @keyframes sheenSweep{0%{transform:translateX(-130%)}42%,100%{transform:translateX(130%)}}
        @keyframes logoShimmer{
          0%{transform:translateX(-135%);opacity:0}
          3%{opacity:0}
          6%{opacity:.9}
          11%{opacity:.9}
          16%{transform:translateX(135%);opacity:0}
          100%{transform:translateX(135%);opacity:0}
        }
        @keyframes pulseDot{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}
        @keyframes bgGlowBreath{0%{transform:translate(-50%,-50%) scale(0.92);opacity:0.7}100%{transform:translate(-50%,-50%) scale(1.08);opacity:0.9}}
        @media (prefers-reduced-motion: reduce){
          *{animation-duration:.01ms !important;animation-iteration-count:1 !important;animation-delay:0ms !important;transition-duration:.01ms !important}
        }
      ` }} />

      {/* Floating Panel Access button in the top right corner */}
      <div className="absolute top-6 right-6 z-50 animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_both] delay-[2.4s]">
        {accessToken ? (
          <Link
            to={user?.role === 'EMPRESA_OPERATOR' ? '/portal' : '/dashboard'}
            className="magnetic inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur-md hover:bg-zinc-900 text-xs font-semibold text-zinc-100 hover:text-white px-4 py-2.5 transition-all duration-200"
          >
            Ir al Panel <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowGate(true)}
            className="magnetic inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur-md hover:bg-zinc-900 text-xs font-semibold text-zinc-100 hover:text-white px-4 py-2.5 transition-all duration-200"
          >
            Ingresar <LogIn className="size-3.5" />
          </button>
        )}
      </div>

      <div ref={rootRef} style={{
        // Variables CSS inyectadas en línea de la landing
        // @ts-ignore
        '--granate': '#50101A',
        '--accent-a': '#8E1B2D',
        '--accent-b': '#B5253A',
        '--ink': '#F6EEEF',
        '--muted': '#B9A9AC',
        '--line': 'rgba(246,238,239,0.10)',
        '--gold': '#C9A24B',
        position: 'relative',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#0B0607',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px,3.5vh,44px) 16px',
        perspective: '1400px',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        {/* Capa 0: Canvas Cosmos (Estrellas titilantes y Nebulosas fluidas dibujadas programáticamente) */}
        <canvas id="cosmos" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}></canvas>

        {/* Capa 1: Rejilla Geométrica (Grid) superpuesta sobre el Cosmos */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)',
          opacity: 0.9
        }}></div>

        {/* Capa 2: Viñeta para difuminar bordes del viewport */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          background: 'radial-gradient(130% 130% at 50% 50%, transparent 40%, rgba(0,0,0,0.8) 100%)'
        }}></div>

        {/* Contenido (bloque con tilt) */}
        <div id="tiltBlock" style={{
          position: 'relative',
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(18px, 3.2vh, 38px)',
          width: '100%',
          maxWidth: '1120px',
          textAlign: 'center',
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}>
          {/* Logo CosteAR */}
          <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '150%',
                height: '150%',
                transform: 'translate(-50%,-50%)',
                background: 'radial-gradient(closest-side, rgba(142,27,45,0.55), transparent 70%)',
                filter: 'blur(20px)',
                zIndex: 0,
                animation: 'logoGlow 5s ease-in-out infinite',
                pointerEvents: 'none'
              }}></div>
              <div id="logoMark" role="img" aria-label="CosteAR" style={{
                position: 'relative',
                zIndex: 1,
                width: 'clamp(96px, 12vw, 140px)',
                height: 'clamp(92px, 11.4vw, 134px)',
                color: 'var(--ink)'
              }}></div>

            </div>
            <div id="wordmark" style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 'clamp(15px, 1.5vw, 19px)',
              letterSpacing: '.42em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              paddingLeft: '.42em',
              opacity: 0
            }}>CosteAR</div>
          </header>

          {/* Frase central */}
          <div style={{ position: 'relative', maxWidth: '1000px' }}>
            <h1 id="phraseWords" style={{
              margin: 0,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: '0 .22em',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: 'clamp(48px, 8vw, 116px)',
              lineHeight: .98,
              letterSpacing: '-0.01em',
              color: 'var(--ink)'
            }}>
              <span style={{ display: 'inline-block', animation: 'wordIn .6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '.90s' }}>Algo</span>
              <span style={{
                display: 'inline-block',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: '.86em',
                letterSpacing: '-0.01em',
                background: 'linear-gradient(120deg, var(--accent-a), var(--accent-b))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animation: 'wordIn .6s cubic-bezier(0.16,1,0.3,1) both',
                animationDelay: '.99s'
              }}>grande</span>
              <span style={{ display: 'inline-block', animation: 'wordIn .6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '1.08s' }}>está</span>
              <span style={{ display: 'inline-block', fontStyle: 'italic', fontWeight: 500, animation: 'wordIn .6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '1.17s' }}>por</span>
              <span style={{ display: 'inline-block', animation: 'wordIn .6s cubic-bezier(0.16,1,0.3,1) both', animationDelay: '1.26s' }}>llegar.</span>
            </h1>

          </div>

          {/* Contador */}
          <section aria-label="Cuenta regresiva al lanzamiento" style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div id="cntLabel" style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 'clamp(11px, 1.1vw, 13px)',
              letterSpacing: '.34em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeUp .5s cubic-bezier(0.16,1,0.3,1) both',
              animationDelay: '2.0s'
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 8px 1px rgba(201,162,75,.7)',
                animation: 'pulseDot 2.6s ease-in-out infinite'
              }}></span>
              Lanzamiento · El gran día
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 'min(84vw,660px)',
                height: '230px',
                background: 'radial-gradient(closest-side, rgba(142,27,45,0.55), transparent 76%)',
                filter: 'blur(44px)',
                transform: 'translate(-50%,-50%)',
                animation: 'glowBreath 4s ease-in-out infinite',
                zIndex: 0,
                pointerEvents: 'none'
              }}></div>

              <div id="counter" style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: 'clamp(8px,1.6vw,18px)',
                alignItems: 'stretch'
              }}>
                {/* Días */}
                <div data-unit="days" style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '9px',
                  padding: 'clamp(13px, 2vh, 20px) clamp(13px, 2.2vw, 26px) clamp(15px, 2.2vh, 22px)',
                  borderRadius: '22px',
                  background: 'rgba(246,238,239,0.04)',
                  border: '1px solid var(--line)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  boxShadow: '0 16px 48px -16px rgba(142,27,45,0.6), inset 0 1px 0 rgba(246,238,239,0.07)',
                  minWidth: 'clamp(70px,15vw,138px)',
                  overflow: 'hidden',
                  animation: 'cardIn .6s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: '1.5s'
                }}>
                  <div className="digs" style={{
                    display: 'flex',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 'clamp(46px, 8vw, 104px)',
                    lineHeight: 1,
                    color: 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    <span className="dig" style={{ display: 'inline-block', width: '.62em', textAlign: 'center', willChange: 'transform' }}>0</span>
                    <span className="dig" style={{ display: 'inline-block', width: '.62em', textAlign: 'center', willChange: 'transform' }}>0</span>
                  </div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 'clamp(10px, 1vw, 12px)',
                    letterSpacing: '.26em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)'
                  }}>Días</div>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px', background: 'rgba(246,238,239,0.08)' }}>
                    <div className="fill" data-fill="days" style={{
                      height: '100%',
                      transformOrigin: 'left center',
                      transform: 'scaleX(0)',
                      background: 'linear-gradient(90deg,var(--accent-a),var(--accent-b))',
                      transition: 'transform .35s cubic-bezier(0.4,0,0.2,1)'
                    }}></div>
                  </div>
                </div>

                {/* Horas */}
                <div data-unit="hours" style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '9px',
                  padding: 'clamp(13px, 2vh, 20px) clamp(13px, 2.2vw, 26px) clamp(15px, 2.2vh, 22px)',
                  borderRadius: '22px',
                  background: 'rgba(246,238,239,0.04)',
                  border: '1px solid var(--line)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  boxShadow: '0 16px 48px -16px rgba(142,27,45,0.6), inset 0 1px 0 rgba(246,238,239,0.07)',
                  minWidth: 'clamp(70px,15vw,138px)',
                  overflow: 'hidden',
                  animation: 'cardIn .6s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: '1.59s'
                }}>
                  <div className="digs" style={{
                    display: 'flex',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 'clamp(46px, 8vw, 104px)',
                    lineHeight: 1,
                    color: 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    <span className="dig" style={{ display: 'inline-block', width: '.62em', textAlign: 'center', willChange: 'transform' }}>0</span>
                    <span className="dig" style={{ display: 'inline-block', width: '.62em', textAlign: 'center', willChange: 'transform' }}>0</span>
                  </div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 'clamp(10px, 1vw, 12px)',
                    letterSpacing: '.26em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)'
                  }}>Horas</div>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px', background: 'rgba(246,238,239,0.08)' }}>
                    <div className="fill" data-fill="hours" style={{
                      height: '100%',
                      transformOrigin: 'left center',
                      transform: 'scaleX(0)',
                      background: 'linear-gradient(90deg,var(--accent-a),var(--accent-b))',
                      transition: 'transform .35s cubic-bezier(0.4,0,0.2,1)'
                    }}></div>
                  </div>
                </div>

                {/* Minutos */}
                <div data-unit="minutes" style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '9px',
                  padding: 'clamp(13px, 2vh, 20px) clamp(13px, 2.2vw, 26px) clamp(15px, 2.2vh, 22px)',
                  borderRadius: '22px',
                  background: 'rgba(246,238,239,0.04)',
                  border: '1px solid var(--line)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  boxShadow: '0 16px 48px -16px rgba(142,27,45,0.6), inset 0 1px 0 rgba(246,238,239,0.07)',
                  minWidth: 'clamp(70px,15vw,138px)',
                  overflow: 'hidden',
                  animation: 'cardIn .6s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: '1.68s'
                }}>
                  <div className="digs" style={{
                    display: 'flex',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 'clamp(46px, 8vw, 104px)',
                    lineHeight: 1,
                    color: 'var(--ink)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    <span className="dig" style={{ display: 'inline-block', width: '.62em', textAlign: 'center', willChange: 'transform' }}>0</span>
                    <span className="dig" style={{ display: 'inline-block', width: '.62em', textAlign: 'center', willChange: 'transform' }}>0</span>
                  </div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 'clamp(10px, 1vw, 12px)',
                    letterSpacing: '.26em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)'
                  }}>Min</div>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px', background: 'rgba(246,238,239,0.08)' }}>
                    <div className="fill" data-fill="minutes" style={{
                      height: '100%',
                      transformOrigin: 'left center',
                      transform: 'scaleX(0)',
                      background: 'linear-gradient(90deg,var(--accent-a),var(--accent-b))',
                      transition: 'transform .35s cubic-bezier(0.4,0,0.2,1)'
                    }}></div>
                  </div>
                </div>

                {/* Segundos */}
                <div data-unit="seconds" style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '9px',
                  padding: 'clamp(13px, 2vh, 20px) clamp(13px, 2.2vw, 26px) clamp(15px, 2.2vh, 22px)',
                  borderRadius: '22px',
                  background: 'rgba(246,238,239,0.04)',
                  border: '1px solid var(--line)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  boxShadow: '0 16px 48px -16px rgba(142,27,45,0.6), inset 0 1px 0 rgba(246,238,239,0.07)',
                  minWidth: 'clamp(70px,15vw,138px)',
                  overflow: 'hidden',
                  animation: 'cardIn .6s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: '1.77s'
                }}>
                  <div className="digs" style={{
                    display: 'flex',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 'clamp(46px, 8vw, 104px)',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    <span className="dig" style={{
                      display: 'inline-block',
                      width: '.62em',
                      textAlign: 'center',
                      willChange: 'transform',
                      background: 'linear-gradient(150deg,var(--accent-b),var(--accent-a))',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}>0</span>
                    <span className="dig" style={{
                      display: 'inline-block',
                      width: '.62em',
                      textAlign: 'center',
                      willChange: 'transform',
                      background: 'linear-gradient(150deg,var(--accent-b),var(--accent-a))',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}>0</span>
                  </div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 'clamp(10px, 1vw, 12px)',
                    letterSpacing: '.26em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)'
                  }}>Seg</div>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px', background: 'rgba(246,238,239,0.08)' }}>
                    <div className="fill" data-fill="seconds" style={{
                      height: '100%',
                      transformOrigin: 'left center',
                      transform: 'scaleX(0)',
                      background: 'linear-gradient(90deg,var(--accent-a),var(--accent-b))',
                      transition: 'transform .35s cubic-bezier(0.4,0,0.2,1)'
                    }}></div>
                  </div>
                </div>
              </div>

              {/* Estado "llegó el gran día" */}
              <div id="arrived" style={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                zIndex: 1,
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 'clamp(38px, 7vw, 92px)',
                lineHeight: 1,
                color: 'var(--ink)'
              }}>¡Llegó el gran día! 🚀</div>
            </div>
          </section>

          {/* CTAs de contacto */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a className="magnetic" href="https://wa.me/5493816580360" target="_blank" rel="noopener" style={{
              minHeight: '48px',
              padding: '0 22px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '999px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              color: '#fff',
              background: 'linear-gradient(135deg,var(--accent-a),var(--accent-b))',
              border: '1px solid rgba(246,238,239,0.14)',
              boxShadow: '0 12px 32px -10px rgba(181,37,58,0.7)',
              cursor: 'pointer',
              transition: 'box-shadow .2s ease, border-color .2s ease',
              animation: 'ctaIn .55s cubic-bezier(0.16,1,0.3,1) both',
              animationDelay: '2.2s'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"></path></svg>
              WhatsApp
            </a>
            <a className="magnetic" href="mailto:proyectocostear@gmail.com" style={{
              minHeight: '48px',
              padding: '0 22px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '999px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              color: 'var(--ink)',
              background: 'rgba(246,238,239,0.04)',
              border: '1px solid var(--line)',
              cursor: 'pointer',
              transition: 'background .2s ease, border-color .2s ease',
              animation: 'ctaIn .55s cubic-bezier(0.16,1,0.3,1) both',
              animationDelay: '2.28s'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              Email
            </a>
            <a className="magnetic" href="https://www.instagram.com/coste_ar?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener" style={{
              minHeight: '48px',
              padding: '0 22px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '999px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              color: 'var(--ink)',
              background: 'rgba(246,238,239,0.04)',
              border: '1px solid var(--line)',
              cursor: 'pointer',
              transition: 'background .2s ease, border-color .2s ease',
              animation: 'ctaIn .55s cubic-bezier(0.16,1,0.3,1) both',
              animationDelay: '2.36s'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              Instagram
            </a>
          </div>

          {/* Footer */}
          <footer style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 400,
            fontSize: '13px',
            letterSpacing: '.06em',
            color: 'var(--muted)',
            animation: 'fadeUp .5s cubic-bezier(0.16,1,0.3,1) both',
            animationDelay: '2.5s'
          }}>CosteAR · 2026 · Hecho en Tucumán 🇦🇷</footer>
        </div>
      </div>

      {showGate && (
        <AccessGateModal
          onClose={() => setShowGate(false)}
          onSuccess={() => navigate({ to: '/login' })}
        />
      )}
    </div>
  );
}
