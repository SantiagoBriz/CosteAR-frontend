import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { ArrowRight, LogIn } from 'lucide-react';

export function LandingPage() {
  const { accessToken, user } = useAuthStore();
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

    // 2. Cosmos: campo de estrellas en canvas 2D (3 capas) + nebulosa con parallax + fugaces
    let cosmosResizeHandler: (() => void) | null = null;
    let animationFrameId: number | null = null;
    let cosmosCleanup: (() => void) | null = null;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const buildCosmos = (el: HTMLElement) => {
      const canvas = el.querySelector('#cosmos') as HTMLCanvasElement | null;
      const nebula = el.querySelector('#nebula') as HTMLElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rand = (a: number, b: number) => a + Math.random() * (b - a);
      const warm = ['rgba(229,176,150', 'rgba(206,120,118', 'rgba(181,37,58'];

      interface Star {
        x: number;
        y: number;
        r: number;
        a: number;
        ph: number;
        sp: number;
        halo: boolean;
        warm: string | null;
      }

      interface Layer {
        px: number;
        density: number;
        rMin: number;
        rMax: number;
        aMin: number;
        aMax: number;
        tw: number;
        halo: boolean;
        stars: Star[];
      }

      const layers: Layer[] = [
        { px: 4,  density: 8200,  rMin: 0.4, rMax: 0.8, aMin: 0.22, aMax: 0.62, tw: 0.7, halo: false, stars: [] },
        { px: 10, density: 13000, rMin: 0.5, rMax: 1.1, aMin: 0.28, aMax: 0.82, tw: 1.0, halo: false, stars: [] },
        { px: 20, density: 30000, rMin: 0.8, rMax: 1.9, aMin: 0.4,  aMax: 1.0,  tw: 1.4, halo: true,  stars: [] }
      ];

      let W = 0, H = 0, DPR = 1;
      const gen = () => {
        W = window.innerWidth; H = window.innerHeight;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const area = W * H;
        layers.forEach((L, li) => {
          if (!L) return;
          const n = Math.round(area / L.density);
          L.stars = [];
          for (let i = 0; i < n; i++) {
            const r = rand(L.rMin, L.rMax);
            const isWarm = li === 2 && Math.random() < 0.16;
            const warmColor = isWarm ? (warm[Math.floor(Math.random() * warm.length)] ?? null) : null;
            L.stars.push({
              x: Math.random() * W, y: Math.random() * H, r,
              a: rand(L.aMin, L.aMax),
              ph: Math.random() * Math.PI * 2,
              sp: rand(0.5, 1.1) * L.tw,
              halo: L.halo && r > 1.3 && Math.random() < 0.5,
              warm: warmColor
            });
          }
        });
      };
      gen();
      cosmosResizeHandler = gen;
      window.addEventListener('resize', gen);

      let pxC = 0, pyC = 0;
      interface ShootingStar {
        x: number;
        y: number;
        vx: number;
        vy: number;
        len: number;
        start: number;
        dur: number;
      }
      let shoot: ShootingStar | null = null;
      let nextShoot = performance.now() + rand(4000, 8000);

      const spawnShoot = (now: number) => {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const ang = rand(0.18, 0.34);
        const speed = rand(0.95, 1.5);
        shoot = {
          x: dir > 0 ? -60 : W + 60,
          y: rand(0.06, 0.5) * H,
          vx: dir * Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          len: rand(150, 250),
          start: now, dur: rand(700, 1000)
        };
      };

      const start = performance.now();
      const draw = (now: number) => {
        const t = (now - start) / 1000;
        const mx = mouseX;
        const my = mouseY;
        const tnx = (mx / W) * 2 - 1, tny = (my / H) * 2 - 1;
        const interactive = fine && !reduce;
        pxC += ((interactive ? tnx : 0) - pxC) * 0.06;
        pyC += ((interactive ? tny : 0) - pyC) * 0.06;

        const driftX = reduce ? 0 : t * 11;
        const driftY = reduce ? 0 : t * 4.5;

        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, t / 1.3);

        for (let li = 0; li < layers.length; li++) {
          const L = layers[li];
          if (!L) continue;
          const ox = -pxC * L.px + driftX;
          const oy = -pyC * L.px + driftY;
          for (let i = 0; i < L.stars.length; i++) {
            const s = L.stars[i];
            if (!s) continue;
            let x = ((s.x + ox) % W + W) % W;
            let y = ((s.y + oy) % H + H) % H;
            const tw = reduce ? 0.8 : (0.62 + 0.38 * Math.sin(t * s.sp + s.ph));
            const alpha = s.a * tw;
            const col = s.warm || 'rgba(255,255,255';
            if (s.halo) {
              const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4.5);
              g.addColorStop(0, col + ',' + (alpha * 0.85) + ')');
              g.addColorStop(1, col + ',0)');
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(x, y, s.r * 4.5, 0, 6.283); ctx.fill();
            }
            ctx.fillStyle = col + ',' + alpha + ')';
            ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
          }
        }

        if (!reduce) {
          if (!shoot && now >= nextShoot) spawnShoot(now);
          if (shoot) {
            const e = (now - shoot.start) / shoot.dur;
            if (e >= 1) { shoot = null; nextShoot = now + rand(8000, 14000); }
            else {
              const hx = shoot.x + shoot.vx * (now - shoot.start);
              const hy = shoot.y + shoot.vy * (now - shoot.start);
              const op = Math.sin(Math.min(1, e) * Math.PI);
              const vlen = Math.hypot(shoot.vx, shoot.vy) || 1;
              const ux = shoot.vx / vlen, uy = shoot.vy / vlen;
              const tx = hx - ux * shoot.len, ty = hy - uy * shoot.len;
              const gr = ctx.createLinearGradient(tx, ty, hx, hy);
              gr.addColorStop(0, 'rgba(255,248,242,0)');
              gr.addColorStop(1, 'rgba(255,248,242,' + (op * 0.9) + ')');
              ctx.strokeStyle = gr; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
              const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 3.2);
              hg.addColorStop(0, 'rgba(255,244,236,' + op + ')');
              hg.addColorStop(1, 'rgba(255,244,236,0)');
              ctx.fillStyle = hg;
              ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, 6.283); ctx.fill();
            }
          }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        if (nebula && interactive) nebula.style.transform = 'translate(' + (-pxC * 4) + 'px,' + (-pyC * 4) + 'px)';

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

    // 5. FX cursor glow + card tilt parallax + magnetic buttons
    const startPointerFX = (el: HTMLElement) => {
      const glow = el.querySelector('#cursorGlow') as HTMLElement | null;
      const tilt = el.querySelector('#tiltBlock') as HTMLElement | null;

      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let gx = mx, gy = my, cnx = 0, cny = 0;

      const onMove = (e: MouseEvent) => {
        mx = e.clientX; my = e.clientY;
        mouseX = mx; mouseY = my;
        if (glow) glow.style.opacity = '1';
      };
      window.addEventListener('mousemove', onMove);

      let pointerRafId: number | null = null;
      const loop = () => {
        gx += (mx - gx) * 0.12;
        gy += (my - gy) * 0.12;
        if (glow) glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px) translate(-50%,-50%)';

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
          <Link
            to="/login"
            className="magnetic inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 backdrop-blur-md hover:bg-zinc-900 text-xs font-semibold text-zinc-100 hover:text-white px-4 py-2.5 transition-all duration-200"
          >
            Ingresar <LogIn className="size-3.5" />
          </Link>
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
        background: 'linear-gradient(160deg,#0E0708 0%,#140A0C 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px,3.5vh,44px) 16px',
        perspective: '1400px',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        {/* Capa 0: nebulosa granate muy difusa (parallax lejano) */}
        <div id="nebula" style={{
          position: 'absolute',
          inset: '-12%',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.95,
          willChange: 'transform',
          animation: 'nebIn 2s ease both'
        }}>
          <div style={{
            position: 'absolute',
            top: '42%',
            left: '48%',
            width: '60vw',
            height: '60vw',
            maxWidth: '780px',
            maxHeight: '780px',
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(80,16,26,0.30), transparent 70%)',
            filter: 'blur(82px)',
            animation: 'nebDrift1 26s ease-in-out infinite'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '28%',
            left: '22%',
            width: '44vw',
            height: '44vw',
            maxWidth: '540px',
            maxHeight: '540px',
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(42,10,18,0.34), transparent 72%)',
            filter: 'blur(74px)',
            animation: 'nebDrift2 30s ease-in-out infinite'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '72%',
            left: '74%',
            width: '40vw',
            height: '40vw',
            maxWidth: '480px',
            maxHeight: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(142,27,45,0.20), transparent 72%)',
            filter: 'blur(88px)',
            animation: 'nebDrift3 22s ease-in-out infinite'
          }}></div>
        </div>

        {/* Capa 1: campo de estrellas (canvas 2D, 3 capas de profundidad + fugaces) */}
        <canvas id="cosmos" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}></canvas>

        {/* Capa 3: luz reactiva al mouse */}
        <div id="cursorGlow" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(142,27,45,0.32), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 2,
          opacity: 0,
          transition: 'opacity .5s ease',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
          willChange: 'transform'
        }}></div>

        {/* Viñeta superior */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
          background: 'radial-gradient(120% 120% at 50% 50%, transparent 50%, rgba(0,0,0,0.62) 100%)'
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
              <div id="logoSweep" style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                pointerEvents: 'none',
                opacity: 0,
                background: 'linear-gradient(100deg, transparent 42%, rgba(246,238,239,0.55) 50%, transparent 58%)',
                mixBlendMode: 'screen',
                animation: 'logoShimmer 8.5s ease-in-out 2.2s infinite',
                willChange: 'transform, opacity'
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
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.14) 50%, transparent 58%)',
              mixBlendMode: 'screen',
              animation: 'sheenSweep 6s ease-in-out 3s infinite',
              willChange: 'transform'
            }}></div>
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
            <a className="magnetic" href="https://wa.me/549381000000" target="_blank" rel="noopener" style={{
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
            <a className="magnetic" href="mailto:hola@costear.com" style={{
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
            <a className="magnetic" href="https://instagram.com/costear.ar" target="_blank" rel="noopener" style={{
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
    </div>
  );
}
