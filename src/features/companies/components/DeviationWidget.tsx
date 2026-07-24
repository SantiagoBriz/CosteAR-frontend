import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DeviationWidget({ companyId }: { companyId: string }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['companies', companyId, 'deviations'],
    queryFn: () => api.get(`/companies/${companyId}/deviations`).then(res => res.data.data),
  });

  if (isLoading) return <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />;
  if (!report || !report.actual || !report.target) return null; // No hay suficientes datos para comparar

  const { target, actual, isDeviating } = report;

  const getStatusColor = (act: number, tgt: number, isMargin: boolean) => {
    const diff = act - tgt;
    if (isMargin) {
      if (diff < -5) return 'bg-red-500';
      if (diff < 0) return 'bg-yellow-500';
      return 'bg-emerald-500';
    } else {
      if (diff > 5) return 'bg-red-500';
      if (diff > 0) return 'bg-yellow-500';
      return 'bg-emerald-500';
    }
  };

  const getTextColor = (act: number, tgt: number, isMargin: boolean) => {
    const diff = act - tgt;
    if (isMargin) {
      if (diff < -5) return 'text-red-700';
      if (diff < 0) return 'text-yellow-700';
      return 'text-emerald-700';
    } else {
      if (diff > 5) return 'text-red-700';
      if (diff > 0) return 'text-yellow-700';
      return 'text-emerald-700';
    }
  };

  return (
    <div className={cn(
      "mb-6 rounded-xl border p-5 shadow-sm transition-all",
      isDeviating ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            Monitor de Rentabilidad en Tiempo Real
            {isDeviating && <AlertTriangle className="size-5 text-red-500" />}
          </h3>
          <p className="text-sm text-zinc-600">
            Comparación de tu Estructura Objetivo vs. Ejecución Real del mes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Materia Prima', act: actual.rawMaterialsPct, tgt: target.rawMaterialsPct, isMargin: false },
          { label: 'Mano de Obra', act: actual.laborPct, tgt: target.laborPct, isMargin: false },
          { label: 'Costos Indirectos', act: actual.cifPct, tgt: target.cifPct, isMargin: false },
          { label: 'Margen Neto', act: actual.marginPct, tgt: target.marginPct, isMargin: true },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-zinc-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-zinc-500">{item.label}</span>
              <span className={cn("text-sm font-bold", getTextColor(item.act, item.tgt, item.isMargin))}>
                {item.act}%
              </span>
            </div>
            
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 mb-1">
              <div 
                className={cn("absolute h-full transition-all duration-500", getStatusColor(item.act, item.tgt, item.isMargin))} 
                style={{ width: `${Math.min(item.act, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Real</span>
              <span>Objetivo: {item.tgt}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
