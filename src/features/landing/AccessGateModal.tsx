import { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Gate de acceso previo al login (producto en construcción). La contraseña se
 * verifica en el backend contra un hash Argon2 (POST /access-gate); acá nunca
 * vive el texto plano ni el hash. Estética de la landing (oscuro + granate).
 */
export function AccessGateModal({ onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (!password.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/access-gate', { password });
      onSuccess();
    } catch (e) {
      setError(apiErrorMessage(e) || 'Contraseña incorrecta');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      onClick={onClose}
    >
      <style>{`@keyframes gateShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}`}</style>
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-7 text-zinc-100"
        style={{ boxShadow: '0 0 70px -12px rgba(80,16,26,0.75)', animation: shake ? 'gateShake .4s' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <X className="size-5" />
        </button>

        <div className="mb-4 flex size-11 items-center justify-center rounded-xl" style={{ background: 'rgba(80,16,26,0.35)' }}>
          <Lock className="size-5" style={{ color: '#e0919b' }} />
        </div>

        <h2 className="mb-2 text-[23px] leading-tight text-white" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>
          Muchas gracias por su interés
        </h2>
        <p className="mb-6 text-[14px] leading-relaxed text-zinc-400">
          Estamos trabajando en estos momentos para brindar un servicio de calidad.
        </p>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Contraseña de acceso
        </label>
        <input
          type="password"
          value={password}
          autoFocus
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Ingresá la clave del equipo"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-[15px] text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-[#7a2230]"
        />
        {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={password.trim().length === 0 || loading}
          className="mt-5 w-full rounded-xl py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: 'linear-gradient(120deg,#50101A,#7a1a28)' }}
        >
          {loading ? 'Verificando…' : 'Acceder'}
        </button>
      </div>
    </div>
  );
}
