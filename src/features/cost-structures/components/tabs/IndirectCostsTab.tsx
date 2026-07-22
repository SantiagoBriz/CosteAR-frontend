import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { IndirectCostsForm } from '../../IndirectCostsForm';
import { CostCentersView } from '../../CostCentersView';
import type { IndirectCostConfig } from '../../cost-structure-types';
import type { CalculationResult } from '@/lib/types';

export function IndirectCostsTab({
  config, perDepartment, onSave, saving, companyId, structureId,
}: {
  config?: IndirectCostConfig;
  perDepartment?: CalculationResult['detail']['indirectCosts']['perDepartment'];
  onSave: (data: IndirectCostConfig) => Promise<void>;
  saving: boolean;
  companyId?: string;
  structureId?: string;
}) {
  const [editing, setEditing] = useState(!config?.centers?.length);

  if (editing) {
    return (
      <div className="space-y-2 pt-1">
        {!!config?.centers?.length && (
          <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-[13px] text-granate hover:text-action">
            <ArrowLeft className="size-3.5" /> Volver a la lista de centros
          </button>
        )}
        <IndirectCostsForm
          defaultValues={config}
          onSave={async (d) => { await onSave(d); setEditing(false); }}
          saving={saving}
          companyId={companyId}
        />
      </div>
    );
  }

  return (
    <CostCentersView
      config={config ?? { centers: [], concepts: [], serviceDistributions: [], productiveSettings: [] }}
      perDepartment={perDepartment}
      onEdit={() => setEditing(true)}
      structureId={structureId}
      companyId={companyId}
    />
  );
}
