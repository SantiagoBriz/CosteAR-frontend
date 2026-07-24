import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Radar, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompany } from '../company-hooks';

export function BenchmarkRadarWidget({ companyId }: { companyId: string }) {
  const { data: company } = useCompany(companyId);
  const industry = company?.industry || 'General';

  // Traemos el gasto REAL actual
  const { data: deviations } = useQuery({
    queryKey: ['companies', companyId, 'deviations'],
    queryFn: () => api.get(`/companies/${companyId}/deviations`).then(res => res.data.data),
  });

  // Traemos el promedio del MERCADO
  const { data: benchmark } = useQuery({
    queryKey: ['benchmarks', industry],
    queryFn: () => api.get(`/benchmarks/${encodeURIComponent(industry)}`).then((res) => res.data.data),
    enabled: !!industry,
  });

  if (!deviations?.actual || !benchmark) return null;

  const actual = deviations.actual;
  
  const insights: { type: 'success' | 'danger'; text: string }[] = [];

  const compare = (elementName: string, actualValue: number, marketValue: number, isMargin: boolean) => {
    if (!marketValue || !actualValue) return;
    
    const diff = actualValue - marketValue;
    
    if (isMargin) {
      if (diff < -3) {
        insights.push({
          type: 'danger',
          text: `Tu Margen Neto es del ${actualValue}%. El promedio en ${industry} es del ${marketValue}%. Estás perdiendo un ${Math.abs(diff)}% de rentabilidad frente a tu competencia.`
        });
      } else if (diff > 3) {
        insights.push({
          type: 'success',
          text: `¡Excelente! Tu Margen Neto (${actualValue}%) supera al promedio de ${industry} (${marketValue}%).`
        });
      }
    } else {
      if (diff > 3) {
        insights.push({
          type: 'danger',
          text: `Estás gastando el ${actualValue}% de tus ingresos en ${elementName}. El promedio en ${industry} gasta un ${marketValue}%. Estás perdiendo un ${diff}% de rentabilidad frente a tu competencia.`
        });
      } else if (diff < -3) {
        insights.push({
          type: 'success',
          text: `Tu gasto en ${elementName} (${actualValue}%) es más eficiente que el promedio de ${industry} (${marketValue}%).`
        });
      }
    }
  };

  compare('Materia Prima', actual.rawMaterialsPct, benchmark.rawMaterialsPct, false);
  compare('Mano de Obra', actual.laborPct, benchmark.laborPct, false);
  compare('Costos Indirectos (CIF)', actual.cifPct, benchmark.cifPct, false);
  compare('Margen Neto', actual.marginPct, benchmark.marginPct, true);

  if (insights.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-2">
          <Radar className="size-5 text-blue-500" />
          Radar Competitivo
        </h3>
        <p className="text-sm text-zinc-600">Tus costos están alineados con el promedio del mercado en {industry}.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-4">
        <Radar className="size-5 text-blue-600" />
        Radar Competitivo: {industry}
      </h3>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex items-start gap-3 rounded-lg p-4 border",
              insight.type === 'danger' ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
            )}
          >
            {insight.type === 'danger' ? (
              <TrendingDown className="size-5 text-red-600 mt-0.5 shrink-0" />
            ) : (
              <TrendingUp className="size-5 text-emerald-600 mt-0.5 shrink-0" />
            )}
            <p className={cn(
              "text-sm font-medium leading-relaxed",
              insight.type === 'danger' ? "text-red-900" : "text-emerald-900"
            )}>
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
