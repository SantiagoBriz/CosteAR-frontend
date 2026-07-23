import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DirectLaborForm } from '../../DirectLaborForm';
import { LaborDepartmentsView } from '../../LaborDepartmentsView';
import type { DirectLaborConfig } from '../../cost-structure-types';
import type { CalculationResult } from '@/lib/types';

export function DirectLaborTab({
  config, directLabor, onSave, saving,
}: {
  config?: DirectLaborConfig;
  directLabor?: CalculationResult['detail']['directLabor'];
  onSave: (data: DirectLaborConfig) => Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(!config?.departments?.length);
  const [loadExample, setLoadExample] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2 pt-1">
        {!!config?.departments?.length && (
          <button type="button" onClick={() => { setEditing(false); setLoadExample(false); }} className="inline-flex items-center gap-1 text-[13px] text-granate hover:text-action">
            <ArrowLeft className="size-3.5" /> Volver a la lista de departamentos
          </button>
        )}
        <DirectLaborForm
          defaultValues={config}
          autoLoadExample={loadExample}
          onSave={async (d) => { await onSave(d); setEditing(false); setLoadExample(false); }}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <LaborDepartmentsView
      config={config ?? { workingDays: { totalDaysPerYear: 0, unpaidAbsence: { sundays: 0, saturdays: 0, unjustifiedAbsences: 0, holidaysOnWeekend: 0 }, paidAbsence: { holidays: 0, vacations: 0, sickness: 0, specialLeaves: 0, workAccidents: 0 } }, itcs: { derivationBase: 0, fixedArt: 0, uncertainRemunerative: [], uncertainNonRemunerative: [] }, departments: [] }}
      directLabor={directLabor}
      onEdit={() => { setLoadExample(false); setEditing(true); }}
      onLoadExample={() => { setLoadExample(true); setEditing(true); }}
    />
  );
}
