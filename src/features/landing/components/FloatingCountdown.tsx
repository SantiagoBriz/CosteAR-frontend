import { useState, useEffect } from 'react';

export function FloatingCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date('2026-08-13T09:00:00-03:00').getTime();
    const calculate = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      }
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  const show = timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0;

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/85 leading-none">Cuenta regresiva</span>
      </div>
      <div className="flex items-center gap-2.5 border-t border-line/60 pt-2">
        <div className="text-center min-w-[28px]">
          <span className="block font-mono text-sm font-extrabold text-ink leading-none">{timeLeft.days}</span>
          <span className="text-[9px] text-ink-soft/75 font-semibold mt-0.5 block">días</span>
        </div>
        <span className="text-xs text-ink-soft/40 font-bold pb-3.5">:</span>
        <div className="text-center min-w-[24px]">
          <span className="block font-mono text-sm font-extrabold text-ink leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[9px] text-ink-soft/75 font-semibold mt-0.5 block">hs</span>
        </div>
        <span className="text-xs text-ink-soft/40 font-bold pb-3.5">:</span>
        <div className="text-center min-w-[24px]">
          <span className="block font-mono text-sm font-extrabold text-ink leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[9px] text-ink-soft/75 font-semibold mt-0.5 block">min</span>
        </div>
        <span className="text-xs text-ink-soft/40 font-bold pb-3.5">:</span>
        <div className="text-center min-w-[24px]">
          <span className="block font-mono text-sm font-extrabold text-ink leading-none">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-[9px] text-ink-soft/75 font-semibold mt-0.5 block">seg</span>
        </div>
      </div>
    </div>
  );
}
