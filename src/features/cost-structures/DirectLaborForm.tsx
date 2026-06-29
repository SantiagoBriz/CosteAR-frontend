import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fractionToPercentInput, percentInputToFraction } from '@/lib/utils';
import type { DirectLaborConfig } from './cost-structure-types';

interface Props {
  defaultValues?: DirectLaborConfig;
  onSave: (data: DirectLaborConfig) => Promise<void>;
  saving: boolean;
}

export function ensureDefaultUncertainConcepts(config?: DirectLaborConfig): DirectLaborConfig {
  const base = config ? JSON.parse(JSON.stringify(config)) : emptyDirectLabor();
  if (!base.itcs) {
    base.itcs = { derivationBase: 0.27, fixedArt: 0.015, uncertainRemunerative: [], uncertainNonRemunerative: [] };
  }
  if (!base.itcs.uncertainRemunerative) {
    base.itcs.uncertainRemunerative = [];
  }
  
  const defaults = [
    'IAP (Indemnización por Accidentes Predeterminada)',
    'PAP (Premio Asistencia Perfecta)',
    'PPP (Premio por Productividad)'
  ];
  
  defaults.forEach(name => {
    const exists = base.itcs.uncertainRemunerative.some((r: any) => r.name && r.name.startsWith(name.slice(0, 3)));
    if (!exists) {
      base.itcs.uncertainRemunerative.push({ name, coefficient: 0 });
    }
  });
  
  return base;
}

function cleanDirectLaborForForm(cfg?: DirectLaborConfig): any {
  const base = ensureDefaultUncertainConcepts(cfg);
  return {
    workingDays: {
      totalDaysPerYear: base.workingDays?.totalDaysPerYear === 0 ? '' : (base.workingDays?.totalDaysPerYear ?? ''),
      unpaidAbsence: {
        sundays: base.workingDays?.unpaidAbsence?.sundays === 0 ? '' : (base.workingDays?.unpaidAbsence?.sundays ?? ''),
        saturdays: base.workingDays?.unpaidAbsence?.saturdays === 0 ? '' : (base.workingDays?.unpaidAbsence?.saturdays ?? ''),
        unjustifiedAbsences: base.workingDays?.unpaidAbsence?.unjustifiedAbsences === 0 ? '' : (base.workingDays?.unpaidAbsence?.unjustifiedAbsences ?? ''),
        holidaysOnWeekend: base.workingDays?.unpaidAbsence?.holidaysOnWeekend === 0 ? '' : (base.workingDays?.unpaidAbsence?.holidaysOnWeekend ?? ''),
      },
      paidAbsence: {
        holidays: base.workingDays?.paidAbsence?.holidays === 0 ? '' : (base.workingDays?.paidAbsence?.holidays ?? ''),
        vacations: base.workingDays?.paidAbsence?.vacations === 0 ? '' : (base.workingDays?.paidAbsence?.vacations ?? ''),
        sickness: base.workingDays?.paidAbsence?.sickness === 0 ? '' : (base.workingDays?.paidAbsence?.sickness ?? ''),
        specialLeaves: base.workingDays?.paidAbsence?.specialLeaves === 0 ? '' : (base.workingDays?.paidAbsence?.specialLeaves ?? ''),
        workAccidents: base.workingDays?.paidAbsence?.workAccidents === 0 ? '' : (base.workingDays?.paidAbsence?.workAccidents ?? ''),
      },
    },
    itcs: {
      // Tasas en %: se guardan como fracción (0.27) y se muestran como porcentaje (27).
      derivationBase: fractionToPercentInput(base.itcs?.derivationBase),
      fixedArt: fractionToPercentInput(base.itcs?.fixedArt),
      uncertainRemunerative: (base.itcs?.uncertainRemunerative ?? []).map((r) => ({
        ...r,
        coefficient: fractionToPercentInput(r.coefficient),
      })),
      uncertainNonRemunerative: (base.itcs?.uncertainNonRemunerative ?? []).map((r) => ({
        ...r,
        coefficient: fractionToPercentInput(r.coefficient),
      })),
    },
    departments: (base.departments ?? []).map((d) => ({
      ...d,
      basicRemuneration: d.basicRemuneration === 0 ? '' : (d.basicRemuneration ?? ''),
      hoursWorked: d.hoursWorked === 0 ? '' : (d.hoursWorked ?? ''),
    })),
  };
}

function cleanDirectLaborForSubmit(data: any): DirectLaborConfig {
  const fallbackNum = (val: any, def = 0) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return def;
    return Number(val);
  };
  return {
    workingDays: {
      totalDaysPerYear: fallbackNum(data.workingDays?.totalDaysPerYear, 365),
      unpaidAbsence: {
        sundays: fallbackNum(data.workingDays?.unpaidAbsence?.sundays),
        saturdays: fallbackNum(data.workingDays?.unpaidAbsence?.saturdays),
        unjustifiedAbsences: fallbackNum(data.workingDays?.unpaidAbsence?.unjustifiedAbsences),
        holidaysOnWeekend: fallbackNum(data.workingDays?.unpaidAbsence?.holidaysOnWeekend),
      },
      paidAbsence: {
        holidays: fallbackNum(data.workingDays?.paidAbsence?.holidays),
        vacations: fallbackNum(data.workingDays?.paidAbsence?.vacations),
        sickness: fallbackNum(data.workingDays?.paidAbsence?.sickness),
        specialLeaves: fallbackNum(data.workingDays?.paidAbsence?.specialLeaves),
        workAccidents: fallbackNum(data.workingDays?.paidAbsence?.workAccidents),
      },
    },
    itcs: {
      // % tipeado → fracción para el motor. Si se deja vacío, valores estándar de cátedra.
      derivationBase: data.itcs?.derivationBase === '' || data.itcs?.derivationBase == null
        ? 0.27 : percentInputToFraction(data.itcs.derivationBase),
      fixedArt: data.itcs?.fixedArt === '' || data.itcs?.fixedArt == null
        ? 0.015 : percentInputToFraction(data.itcs.fixedArt),
      uncertainRemunerative: (data.itcs?.uncertainRemunerative ?? []).map((r: any) => ({
        ...r,
        coefficient: percentInputToFraction(r.coefficient),
      })),
      uncertainNonRemunerative: (data.itcs?.uncertainNonRemunerative ?? []).map((r: any) => ({
        ...r,
        coefficient: percentInputToFraction(r.coefficient),
      })),
    },
    departments: (data.departments ?? []).map((d: any) => ({
      ...d,
      basicRemuneration: fallbackNum(d.basicRemuneration),
      hoursWorked: fallbackNum(d.hoursWorked),
    })),
  };
}

export function DirectLaborForm({ defaultValues, onSave, saving }: Props) {
  const { register, control, handleSubmit, reset, formState: { isDirty } } = useForm<DirectLaborConfig>({
    defaultValues: cleanDirectLaborForForm(defaultValues) as any,
  });

  useEffect(() => {
    if (defaultValues) {
      reset(cleanDirectLaborForForm(defaultValues));
    }
  }, [defaultValues, reset]);

  const { fields: remFields, append: appendRem, remove: removeRem } = useFieldArray({ control, name: 'itcs.uncertainRemunerative' });
  const { fields: nonRemFields, append: appendNonRem, remove: removeNonRem } = useFieldArray({ control, name: 'itcs.uncertainNonRemunerative' });
  const { fields: deptFields, append: appendDept, remove: removeDept } = useFieldArray({ control, name: 'departments' });

  const [pending, setPending] = useState<DirectLaborConfig | null>(null);

  return (
    <>
    <form onSubmit={handleSubmit((data) => setPending(cleanDirectLaborForSubmit(data)))} className="space-y-5 pt-3">
      {/* Distribución del año */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Distribución del año
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input label="Total días/año" type="number" step="1" numeric placeholder="Ej: 365" info="Días totales del año (normalmente 365). Número entero. De acá se descuentan las ausencias." {...register('workingDays.totalDaysPerYear', { valueAsNumber: true })} />
        </div>
        <p className="mt-2 mb-1 text-[11px] text-ink-soft font-medium">Ausencias no remuneradas</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Domingos" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.sundays', { valueAsNumber: true })} />
          <Input label="Sábados" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.saturdays', { valueAsNumber: true })} />
          <Input label="Lic. injustificadas" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.unjustifiedAbsences', { valueAsNumber: true })} />
          <Input label="Feriados en finde" type="number" step="1" numeric {...register('workingDays.unpaidAbsence.holidaysOnWeekend', { valueAsNumber: true })} />
        </div>
        <p className="mt-2 mb-1 text-[11px] text-ink-soft font-medium">Ausencias remuneradas</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Input label="Feriados" type="number" step="1" numeric {...register('workingDays.paidAbsence.holidays', { valueAsNumber: true })} />
          <Input label="Vacaciones" type="number" step="1" numeric {...register('workingDays.paidAbsence.vacations', { valueAsNumber: true })} />
          <Input label="Enfermedad" type="number" step="1" numeric {...register('workingDays.paidAbsence.sickness', { valueAsNumber: true })} />
          <Input label="Lic. especiales" type="number" step="1" numeric {...register('workingDays.paidAbsence.specialLeaves', { valueAsNumber: true })} />
          <Input label="Accidentes" type="number" step="1" numeric {...register('workingDays.paidAbsence.workAccidents', { valueAsNumber: true })} />
        </div>
      </section>

      {/* ITCS */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          ITCS — Índice Total de Cargas Sociales
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Base de derivación %" type="number" step="0.1" numeric placeholder="Ej: 27 (%)" info="Contribuciones patronales + ART variable, base para derivar cargas. En porcentaje (ej: 27 = 27%)." {...register('itcs.derivationBase', { valueAsNumber: true })} />
          <Input label="ART fija %" type="number" step="0.01" numeric placeholder="Ej: 1.5 (%)" info="Alícuota fija de ART. En porcentaje (ej: 1.5 = 1,5%)." {...register('itcs.fixedArt', { valueAsNumber: true })} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-ink-soft font-medium">Conceptos remunerativos inciertos</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => appendRem({ name: '', coefficient: 0 })}>
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
          {remFields.map((f, i) => (
            <div key={f.id} className="mb-2 flex items-center gap-2">
              <input className="flex-1 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre (ej: Antigüedad)" {...register(`itcs.uncertainRemunerative.${i}.name`)} />
              <input type="number" step="0.1" className="w-28 rounded border border-line bg-surface px-2 py-1.5 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="Ej: 5 (%)" title="Coeficiente en porcentaje (ej: 5 = 5%)" {...register(`itcs.uncertainRemunerative.${i}.coefficient`, { valueAsNumber: true })} />
              <button type="button" onClick={() => removeRem(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-ink-soft font-medium">Conceptos no remunerativos inciertos</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => appendNonRem({ name: '', coefficient: 0 })}>
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
          {nonRemFields.map((f, i) => (
            <div key={f.id} className="mb-2 flex items-center gap-2">
              <input className="flex-1 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre (ej: Viandas)" {...register(`itcs.uncertainNonRemunerative.${i}.name`)} />
              <input type="number" step="0.1" className="w-28 rounded border border-line bg-surface px-2 py-1.5 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="Ej: 2 (%)" title="Coeficiente en porcentaje (ej: 2 = 2%)" {...register(`itcs.uncertainNonRemunerative.${i}.coefficient`, { valueAsNumber: true })} />
              <button type="button" onClick={() => removeNonRem(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Departamentos */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Departamentos productivos</h4>
          <Button type="button" size="sm" variant="secondary" onClick={() => appendDept({ name: '', basicRemuneration: 0, hoursWorked: 0 })}>
            <Plus className="size-3" /> Agregar
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Departamento</th>
                <th className="px-3 py-2 text-right font-medium">Remuneración básica $</th>
                <th className="px-3 py-2 text-right font-medium">Horas trabajadas</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {deptFields.map((f, i) => (
                <tr key={f.id}>
                  <td className="px-2 py-1.5">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre del dpto." {...register(`departments.${i}.name`)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`departments.${i}.basicRemuneration`, { valueAsNumber: true })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`departments.${i}.hoursWorked`, { valueAsNumber: true })} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => removeDept(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {deptFields.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-ink-soft">Sin departamentos — agregá al menos uno.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-2">
        {isDirty && (
          <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-warn">
            <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
          </p>
        )}
        <Button type="submit" loading={saving} className="w-full">
          Guardar Mano de Obra Directa
        </Button>
      </div>
    </form>

    <ConfirmDialog
      open={!!pending}
      title="Actualizar Mano de Obra"
      message="¿Querés actualizar los datos de Mano de Obra Directa?"
      confirmLabel="Guardar"
      loading={saving}
      onConfirm={async () => {
        if (!pending) return;
        await onSave(pending);
        setPending(null);
      }}
      onCancel={() => setPending(null)}
    />
    </>
  );
}

export function emptyDirectLabor(): DirectLaborConfig {
  return {
    workingDays: {
      totalDaysPerYear: 365,
      unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 0, holidaysOnWeekend: 0 },
      paidAbsence: { holidays: 0, vacations: 0, sickness: 0, specialLeaves: 0, workAccidents: 0 },
    },
    itcs: { derivationBase: 0.27, fixedArt: 0.015, uncertainRemunerative: [], uncertainNonRemunerative: [] },
    departments: [],
  };
}
