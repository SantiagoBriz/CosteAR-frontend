import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  animate?: boolean;
}

export function CosteARLogo({ className, animate = true }: Props) {
  const W = 210;
  const H = 200;
  const cx = 105;
  const cy = 100;
  const Ro = 86;
  const Ri = 45;
  
  // High-contrast symmetrical settings:
  // Spacing (step=16) and thickness (barH=7) centered around cy=100.
  const step = 16;
  const barH = 7;
  const mouthH = 22;

  const segments: { x1: number; w: number; y: number; ady: number }[] = [];

  // Generate exactly 11 horizontal bars mathematically symmetrical around the center line (cy=100)
  for (let k = -5; k <= 5; k++) {
    const y = cy + k * step;
    const dy = y - cy;
    const ady = Math.abs(dy);
    if (ady >= Ro) continue;
    const xo = Math.sqrt(Ro * Ro - dy * dy);
    
    if (ady >= Ri) {
      const x1 = cx - xo;
      const x2 = cx + xo;
      segments.push({ x1, w: Math.max(2.4, x2 - x1), y, ady });
    } else {
      const xi = Math.sqrt(Ri * Ri - dy * dy);
      // Left prong (C body)
      const x1Left = cx - xo;
      const x2Left = cx - xi;
      segments.push({ x1: x1Left, w: Math.max(2.4, x2Left - x1Left), y, ady });
      
      // Right prong (save for the mouth)
      if (ady >= mouthH) {
        const x1Right = cx + xi;
        const x2Right = cx + xo;
        segments.push({ x1: x1Right, w: Math.max(2.4, x2Right - x1Right), y, ady });
      }
    }
  }

  return (
    <div className={cn('relative inline-block overflow-visible', className)}>
      {animate && (
        <style>{`
          @keyframes eqPulseBar {
            0% { transform: scaleX(0.80); }
            100% { transform: scaleX(1); }
          }
        `}</style>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full overflow-visible text-current"
      >
        {segments.map((seg, idx) => {
          // Dynamic pulse timings
          const duration = (2.2 + (idx % 4) * 0.35).toFixed(2);
          const delay = (-(idx % 5) * 0.5).toFixed(2);
          
          return (
            <rect
              key={idx}
              x={seg.x1.toFixed(1)}
              y={(seg.y - barH / 2).toFixed(1)}
              width={seg.w.toFixed(1)}
              height={barH}
              rx={(barH / 2).toFixed(1)}
              fill="currentColor"
              style={
                animate
                  ? {
                      transformBox: 'fill-box',
                      transformOrigin: 'center center',
                      animation: `eqPulseBar ${duration}s ease-in-out ${delay}s infinite alternate`,
                    }
                  : undefined
              }
            />
          );
        })}
      </svg>
    </div>
  );
}
