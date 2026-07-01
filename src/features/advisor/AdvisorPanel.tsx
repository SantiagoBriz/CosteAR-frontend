import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type AdvisorKind = 'cost_result' | 'reconciliation' | 'macro' | 'alerts';

interface AdvisorResult {
  headline: string;
  points: string[];
}

/**
 * Consejero de IA reusable. Toma datos reales ya calculados y pide a la IA una
 * lectura + recomendaciones. Siempre etiquetado como sugerencia — no aplica nada.
 */
export function AdvisorPanel({ kind, context, label = 'Analizar' }: {
  kind: AdvisorKind;
  context: Record<string, unknown>;
  label?: string;
}) {
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ data: AdvisorResult }>('/advisor', { kind, context });
      setResult(res.data.data);
    } catch {
      setError('El consejero no está disponible ahora. Reintentá en un momento.');
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading && !error) {
    return (
      <button
        type="button"
        onClick={run}
        className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[13px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <Sparkles className="size-3.5" /> {label}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-indigo-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Sugerencia</span>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-[13px] text-ink-soft">
          <Loader2 className="size-4 animate-spin" /> Analizando tus números…
        </p>
      )}

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {result && (
        <>
          <p className="text-[14px] font-medium text-ink leading-snug">{result.headline}</p>
          {result.points.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {result.points.map((p, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-ink-soft leading-relaxed">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-indigo-400" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-ink-soft/60">
            Es una sugerencia basada en tus datos — vos decidís.{' '}
            <button type="button" onClick={run} className="text-indigo-600 hover:underline">Volver a analizar</button>
          </p>
        </>
      )}
    </div>
  );
}
