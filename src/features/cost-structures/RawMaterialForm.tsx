import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { RawMaterialConfig } from './cost-structure-types';

interface Props {
  defaultValues?: RawMaterialConfig;
  onSave: (data: RawMaterialConfig) => Promise<void>;
  saving: boolean;
  isProcesses?: boolean;
}

function cleanRawMaterialForForm(cfg?: RawMaterialConfig): any {
  const base = cfg ?? emptyRawMaterial();
  return {
    wilson: {
      annualDemand: base.wilson?.annualDemand === 0 ? '' : (base.wilson?.annualDemand ?? ''),
      orderCost: base.wilson?.orderCost === 0 ? '' : (base.wilson?.orderCost ?? ''),
      holdingRate: base.wilson?.holdingRate === 0 ? '' : (base.wilson?.holdingRate ?? ''),
      unitCost: base.wilson?.unitCost === 0 ? '' : (base.wilson?.unitCost ?? ''),
    },
    stockPolicy: {
      minConsumption: base.stockPolicy?.minConsumption === 0 ? '' : (base.stockPolicy?.minConsumption ?? ''),
      maxConsumption: base.stockPolicy?.maxConsumption === 0 ? '' : (base.stockPolicy?.maxConsumption ?? ''),
      minLeadTime: base.stockPolicy?.minLeadTime === 0 ? '' : (base.stockPolicy?.minLeadTime ?? ''),
      maxLeadTime: base.stockPolicy?.maxLeadTime === 0 ? '' : (base.stockPolicy?.maxLeadTime ?? ''),
      safetyStock: base.stockPolicy?.safetyStock === 0 ? '' : (base.stockPolicy?.safetyStock ?? ''),
    },
    initialStock: {
      quantity: base.initialStock?.quantity === 0 ? '' : (base.initialStock?.quantity ?? ''),
      unitCost: base.initialStock?.unitCost === 0 ? '' : (base.initialStock?.unitCost ?? ''),
    },
    movements: (base.movements ?? []).map((m) => ({
      ...m,
      quantity: m.quantity === 0 ? '' : (m.quantity ?? ''),
      unitCost: m.unitCost === 0 ? '' : (m.unitCost ?? ''),
    })),
  };
}

function cleanRawMaterialForSubmit(data: any): RawMaterialConfig {
  const fallbackNum = (val: any) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
    return Number(val);
  };
  return {
    wilson: {
      annualDemand: fallbackNum(data.wilson?.annualDemand),
      orderCost: fallbackNum(data.wilson?.orderCost),
      holdingRate: fallbackNum(data.wilson?.holdingRate),
      unitCost: fallbackNum(data.wilson?.unitCost),
    },
    stockPolicy: {
      minConsumption: fallbackNum(data.stockPolicy?.minConsumption),
      maxConsumption: fallbackNum(data.stockPolicy?.maxConsumption),
      minLeadTime: fallbackNum(data.stockPolicy?.minLeadTime),
      maxLeadTime: fallbackNum(data.stockPolicy?.maxLeadTime),
      safetyStock: fallbackNum(data.stockPolicy?.safetyStock),
    },
    initialStock: {
      quantity: fallbackNum(data.initialStock?.quantity),
      unitCost: fallbackNum(data.initialStock?.unitCost),
    },
    movements: (data.movements ?? []).map((m: any) => ({
      ...m,
      quantity: fallbackNum(m.quantity),
      unitCost: fallbackNum(m.unitCost),
    })),
  };
}

export function RawMaterialForm({ defaultValues, onSave, saving, isProcesses }: Props) {
  const { register, control, handleSubmit, reset, watch } = useForm<RawMaterialConfig>({
    defaultValues: cleanRawMaterialForForm(defaultValues) as any,
  });

  // Cargar los datos persistidos en el formulario SOLO cuando su contenido cambia
  // de verdad. Sin esta guarda, cualquier re-fetch de la estructura (p. ej. tras
  // invalidar la query al guardar otra sección o calcular) reseteaba el form por
  // cambio de referencia y BORRABA la edición en curso sin guardar (BUG-05).
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!defaultValues) return;
    const snapshot = JSON.stringify(defaultValues);
    if (snapshot === loadedRef.current) return;
    loadedRef.current = snapshot;
    reset(cleanRawMaterialForForm(defaultValues));
  }, [defaultValues, reset]);

  const { fields: movements, append, remove } = useFieldArray({ control, name: 'movements' });

  return (
    <form onSubmit={handleSubmit((data) => onSave(cleanRawMaterialForSubmit(data)))} className="space-y-5 pt-3">
      {/* Wilson */}
      {!isProcesses && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Lote óptimo de Wilson
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Demanda anual (R)" type="number" step="1" numeric {...register('wilson.annualDemand', { valueAsNumber: true })} />
            <Input label="Costo de pedido (S) $" type="number" step="0.01" numeric {...register('wilson.orderCost', { valueAsNumber: true })} />
            <Input label="Tasa de mantenimiento (K) ej: 0.30" type="number" step="0.01" numeric {...register('wilson.holdingRate', { valueAsNumber: true })} />
            <Input label="Costo unitario (C) $" type="number" step="0.01" numeric {...register('wilson.unitCost', { valueAsNumber: true })} />
          </div>
        </section>
      )}

      {/* Política de stock */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Política de stock
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input label="Consumo mínimo/día (Cm)" type="number" step="0.1" numeric {...register('stockPolicy.minConsumption', { valueAsNumber: true })} />
          <Input label="Consumo máximo/día (CM)" type="number" step="0.1" numeric {...register('stockPolicy.maxConsumption', { valueAsNumber: true })} />
          <Input label="Plazo mín. reposición (días)" type="number" step="1" numeric {...register('stockPolicy.minLeadTime', { valueAsNumber: true })} />
          <Input label="Plazo máx. reposición (días)" type="number" step="1" numeric {...register('stockPolicy.maxLeadTime', { valueAsNumber: true })} />
          <Input label="Stock de reserva (Sr)" type="number" step="1" numeric {...register('stockPolicy.safetyStock', { valueAsNumber: true })} />
        </div>
      </section>

      {/* Stock inicial */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Existencia inicial
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Cantidad inicial" type="number" step="1" numeric {...register('initialStock.quantity', { valueAsNumber: true })} />
          <Input label="Costo unitario inicial $" type="number" step="0.01" numeric {...register('initialStock.unitCost', { valueAsNumber: true })} />
        </div>
      </section>

      {/* Movimientos */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Movimientos (ficha PPP)
          </h4>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => append({ date: '', type: 'purchase', detail: '', quantity: 0, unitCost: 0 })}
          >
            <Plus className="size-3" /> Agregar
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Detalle</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Costo unit. $</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movements.map((field, i) => {
                const isConsumption = watch(`movements.${i}.type`) === 'consumption';
                return (
                  <tr key={field.id}>
                    <td className="px-2 py-1.5">
                      <input type="date" className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`movements.${i}.date`)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <select className="rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`movements.${i}.type`)}>
                        <option value="purchase">Compra</option>
                        <option value="consumption">Consumo</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Detalle…" {...register(`movements.${i}.detail`)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" step="1" className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`movements.${i}.quantity`, { valueAsNumber: true })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.01"
                        disabled={isConsumption}
                        className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none disabled:opacity-50 disabled:bg-surface-alt"
                        placeholder={isConsumption ? 'PPP' : 'Monto...'}
                        {...register(`movements.${i}.unitCost`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => remove(i)} className="text-ink-soft hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-[13px] text-ink-soft">Sin movimientos — agregá compras y consumos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Button type="submit" loading={saving} className="w-full">
        Guardar Materia Prima
      </Button>
    </form>
  );
}

export function emptyRawMaterial(): RawMaterialConfig {
  return {
    wilson: { annualDemand: 0, orderCost: 0, holdingRate: 0.3, unitCost: 0 },
    stockPolicy: { minConsumption: 0, maxConsumption: 0, minLeadTime: 0, maxLeadTime: 0, safetyStock: 0 },
    initialStock: { quantity: 0, unitCost: 0 },
    movements: [],
  };
}
