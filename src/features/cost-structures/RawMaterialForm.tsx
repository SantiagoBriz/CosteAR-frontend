import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { fractionToPercentInput, percentInputToFraction } from '@/lib/utils';
import { useCreateDataPoint, useImputar } from './trazabilidad-hooks';
import { proposeImputation } from './imputacion';
import { ImputacionModal } from './ImputacionModal';
import type { RawMaterialConfig, StockMovement } from './cost-structure-types';
import type { ImputacionOption } from './trazabilidad-types';

interface Props {
  structureId: string;
  period?: string;
  defaultValues?: RawMaterialConfig;
  onSave: (data: RawMaterialConfig) => Promise<void>;
  saving: boolean;
  isProcesses?: boolean;
}

interface ImputacionQueueItem {
  detail: string;
  options: ImputacionOption[];
  dataPointIds: string[];
}

function cleanRawMaterialForForm(cfg?: RawMaterialConfig): any {
  const base = cfg ?? emptyRawMaterial();
  return {
    wilson: {
      annualDemand: base.wilson?.annualDemand === 0 ? '' : (base.wilson?.annualDemand ?? ''),
      orderCost: base.wilson?.orderCost === 0 ? '' : (base.wilson?.orderCost ?? ''),
      // Tasa: se guarda como fracción (0.30) pero se muestra/tipea en % (30).
      holdingRate: fractionToPercentInput(base.wilson?.holdingRate),
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
      // Consumo deshabilita el input de costo unitario (es PPP, no se tipea).
      // React Hook Form reporta `null` en getValues() para un input disabled,
      // así que el default tiene que ser `null` y no '' — si no, isDirty da
      // true todo el tiempo aunque nadie tocó nada (comparación '' !== null).
      unitCost: m.type === 'consumption' ? null : (m.unitCost === 0 ? '' : (m.unitCost ?? '')),
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
      // % tipeado (30) → fracción guardada (0.30) para el motor de cálculo.
      holdingRate: percentInputToFraction(data.wilson?.holdingRate),
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

export function RawMaterialForm({ structureId, period, defaultValues, onSave, saving, isProcesses }: Props) {
  const { register, control, handleSubmit, reset, watch, formState: { isDirty } } = useForm<RawMaterialConfig>({
    defaultValues: cleanRawMaterialForForm(defaultValues) as any,
  });

  const loadedRef = useRef<string | null>(null);
  // Cuántos movimientos ya existían en el server la última vez que sincronizamos
  // — todo lo que se agregue por encima de este número en la sesión de edición
  // actual es "nuevo" y, al guardar, se registra como dato trazable (D.3).
  const baseMovementsCountRef = useRef(0);
  useEffect(() => {
    if (!defaultValues) return;
    const snapshot = JSON.stringify(defaultValues);
    if (snapshot === loadedRef.current) return;
    loadedRef.current = snapshot;
    baseMovementsCountRef.current = defaultValues.movements?.length ?? 0;
    reset(cleanRawMaterialForForm(defaultValues));
  }, [defaultValues, reset]);

  const { fields: movements, append, remove } = useFieldArray({ control, name: 'movements' });

  // Confirmación previa al guardado (paso explícito).
  const [pending, setPending] = useState<RawMaterialConfig | null>(null);

  // Trazabilidad de movimientos nuevos (D.3): cada compra/consumo agregado en
  // esta sesión se registra como DataPoint(s) reales al guardar, y si su
  // fecha cae fuera del período de costo, se pregunta a qué período imputar.
  const createDataPoint = useCreateDataPoint(structureId);
  const imputar = useImputar(structureId);
  const [imputacionQueue, setImputacionQueue] = useState<ImputacionQueueItem[]>([]);
  const currentImputacion = imputacionQueue[0];

  async function registerTrazableMovements(saved: RawMaterialConfig) {
    const baseCount = baseMovementsCountRef.current;
    const newMovements = saved.movements.slice(baseCount).filter((m) => m.date);
    const queueItems: ImputacionQueueItem[] = [];

    for (const m of newMovements as StockMovement[]) {
      try {
        const movementId = crypto.randomUUID();
        const label = `${m.type === 'purchase' ? 'Compra' : 'Consumo'} — ${m.detail || '(sin detalle)'}`;
        const dataPointIds: string[] = [];

        const cantidadDp = await createDataPoint.mutateAsync({
          element: 'MP',
          fieldKey: m.type === 'purchase' ? 'mp.compra.cantidad' : 'mp.consumo.cantidad',
          label,
          unit: 'u',
          sourceArea: m.type === 'purchase' ? 'deposito' : 'planta',
          method: 'manual',
          valueNum: m.quantity,
          valueJson: { movementId, role: 'cantidad' },
          fechaHecho: m.date,
        });
        dataPointIds.push(cantidadDp.id);

        if (m.type === 'purchase') {
          const precioDp = await createDataPoint.mutateAsync({
            element: 'MP',
            fieldKey: 'mp.compra.precio',
            label,
            unit: '$',
            sourceArea: 'contaduria',
            method: 'manual',
            valueNum: m.unitCost ?? 0,
            valueJson: { movementId, role: 'precio' },
            fechaHecho: m.date,
          });
          dataPointIds.push(precioDp.id);
        }

        if (!period) continue;
        const proposal = proposeImputation(m.date, period);
        if ('auto' in proposal) {
          await Promise.all(
            dataPointIds.map((id) => imputar.mutateAsync({ dataPointId: id, periodo: proposal.auto, sourceArea: 'costista' })),
          );
        } else {
          queueItems.push({ detail: label, options: proposal.options, dataPointIds });
        }
      } catch {
        // Un fallo puntual registrando trazabilidad de ESTE movimiento no
        // debe tapar que la sección de Materia Prima ya se guardó bien.
      }
    }

    if (queueItems.length > 0) setImputacionQueue((q) => [...q, ...queueItems]);
  }

  // Pegado desde Excel
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    try {
      const lines = pasteText.split('\n').filter(l => l.trim() !== '');
      const parsedMovements = lines.map((line, idx) => {
        const parts = line.split('\t'); // tab separated
        if (parts.length < 4) {
          throw new Error(`Fila ${idx + 1}: Debe tener al menos Fecha, Tipo (Compra/Consumo), Detalle y Cantidad.`);
        }

        const [dateStr, typeStr, detail, qtyStr, priceStr] = parts;

        let type: 'purchase' | 'consumption' = 'purchase';
        const cleanType = typeStr?.toLowerCase().trim();
        if (cleanType === 'consumo' || cleanType === 'consumption' || cleanType === 'consumido') {
          type = 'consumption';
        }

        let date = dateStr?.trim() || '';
        if (date.includes('/')) {
          const [d, m, y] = date.split('/');
          if (d && m && y) {
            date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }

        const qtyVal = qtyStr?.trim();
        const priceVal = priceStr?.trim();
        const quantity = !qtyVal || isNaN(Number(qtyVal)) ? 0 : Number(qtyVal);
        const unitCost = !priceVal || isNaN(Number(priceVal)) ? 0 : Number(priceVal);

        return {
          date,
          type,
          detail: detail?.trim() || '',
          quantity,
          unitCost: type === 'consumption' ? 0 : unitCost,
        };
      });

      parsedMovements.forEach(m => append(m));
      setPasteText('');
      setPasteError(null);
      setShowPasteArea(false);
    } catch (e: any) {
      setPasteError(e.message || 'Error al parsear el texto de Excel. Verificá el formato.');
    }
  };

  const onSubmit = async (data: any) => {
    setPending(cleanRawMaterialForSubmit(data));
  };

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-3">
      {/* Wilson */}
      {!isProcesses && (
        <section>
          <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
            Lote óptimo de Wilson
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Demanda anual (R)" type="number" step="1" numeric placeholder="Ej: 15000" info="Unidades totales de materia prima que consumís en el año. Número entero." {...register('wilson.annualDemand', { valueAsNumber: true })} />
            <Input label="Costo de pedido (S) $" type="number" step="0.01" numeric placeholder="Ej: 8500" info="Costo fijo de emitir una orden de compra (gestión, flete fijo, etc.). En pesos." {...register('wilson.orderCost', { valueAsNumber: true })} />
            <Input label="Tasa de mantenimiento (K)" type="number" step="0.1" numeric suffix="%" placeholder="Ej: 30" info="Costo anual de mantener stock como porcentaje del valor del inventario. Se escribe en porcentaje (ej: 30 = 30%)." {...register('wilson.holdingRate', { valueAsNumber: true })} />
            <Input label="Costo unitario (C) $" type="number" step="0.01" numeric placeholder="Ej: 1200" info="Costo de una unidad de materia prima. En pesos." {...register('wilson.unitCost', { valueAsNumber: true })} />
          </div>
        </section>
      )}

      {/* Política de stock */}
      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Política de stock
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Consumo mínimo/día (Cm)" type="number" step="0.1" numeric placeholder="Ej: 30" info="Consumo más bajo esperado por día. Sirve para el cálculo del stock de seguridad." {...register('stockPolicy.minConsumption', { valueAsNumber: true })} />
          <Input label="Consumo máximo/día (CM)" type="number" step="0.1" numeric placeholder="Ej: 60" info="Consumo más alto esperado por día." {...register('stockPolicy.maxConsumption', { valueAsNumber: true })} />
          <Input label="Plazo mín. reposición (días)" type="number" step="1" numeric placeholder="Ej: 4" info="Días mínimos que tarda en llegar un pedido. Número entero." {...register('stockPolicy.minLeadTime', { valueAsNumber: true })} />
          <Input label="Plazo máx. reposición (días)" type="number" step="1" numeric placeholder="Ej: 10" info="Días máximos que tarda en llegar un pedido. Número entero." {...register('stockPolicy.maxLeadTime', { valueAsNumber: true })} />
          <Input label="Stock de reserva (Sr)" type="number" step="1" numeric placeholder="Ej: 150" info="Stock de seguridad mínimo que querés mantener siempre. Número entero." {...register('stockPolicy.safetyStock', { valueAsNumber: true })} />
        </div>
      </section>

      {/* Stock inicial */}
      <section>
        <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
          Existencia inicial
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Cantidad inicial" type="number" step="1" numeric placeholder="Ej: 400" info="Unidades de materia prima en stock al inicio del período. Número entero." {...register('initialStock.quantity', { valueAsNumber: true })} />
          <Input label="Costo unitario inicial $" type="number" step="0.01" numeric placeholder="Ej: 1150" info="Costo por unidad de la existencia inicial. En pesos." {...register('initialStock.unitCost', { valueAsNumber: true })} />
        </div>
      </section>

      {/* Movimientos */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
            Movimientos (ficha PPP)
          </h4>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowPasteArea(!showPasteArea)}
            >
              Pegar de Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => append({ date: '', type: 'purchase', detail: '', quantity: 0, unitCost: 0 })}
            >
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
        </div>

        {showPasteArea && (
          <div className="mb-4 rounded-xl border border-line bg-surface-alt p-4 space-y-3 animate-rise">
            <p className="text-[11px] text-ink-soft">
              Copiá las columnas de tu Excel (Fecha, Tipo [Compra/Consumo], Detalle, Cantidad, Precio Unitario [compra]) y pegalas abajo:
            </p>
            <textarea
              className="w-full h-24 rounded-xl border border-line bg-surface p-2 text-xs font-mono outline-none focus:border-granate text-ink"
              placeholder={`Ejemplo:\n01/11/2026\tCompra\tFactura A-123\t100\t1500\n05/11/2026\tConsumo\tPara producción\t50\t0`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {pasteError && <p className="text-xs text-danger">{pasteError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowPasteArea(false); setPasteError(null); }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={handlePasteImport}>Procesar e Importar</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
          <table className="block w-full text-sm sm:table">
            <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Detalle</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Costo unit. $</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
              {movements.map((field, i) => {
                const isConsumption = watch(`movements.${i}.type`) === 'consumption';
                return (
                  <tr key={field.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <td data-label="Fecha" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input type="date" className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`movements.${i}.date`)} />
                    </td>
                    <td data-label="Tipo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-auto" {...register(`movements.${i}.type`)}>
                        <option value="purchase">Compra</option>
                        <option value="consumption">Consumo</option>
                      </select>
                    </td>
                    <td data-label="Detalle" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Detalle…" {...register(`movements.${i}.detail`)} />
                    </td>
                    <td data-label="Cantidad" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-24" {...register(`movements.${i}.quantity`, { valueAsNumber: true })} />
                    </td>
                    <td data-label="Costo unit. $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <input
                        type="number"
                        step="0.01"
                        disabled={isConsumption}
                        className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none disabled:opacity-50 disabled:bg-surface-alt sm:w-28"
                        placeholder={isConsumption ? 'PPP' : 'Monto...'}
                        {...register(`movements.${i}.unitCost`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                      <button type="button" onClick={() => remove(i)} className="text-ink-soft hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr className="block sm:table-row"><td colSpan={6} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Sin movimientos — agregá compras y consumos.</td></tr>
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
          Guardar Materia Prima
        </Button>
      </div>
    </form>

    <ConfirmDialog
      open={!!pending}
      title="Actualizar Materia Prima"
      message="¿Querés actualizar los datos de Materia Prima?"
      confirmLabel="Guardar"
      loading={saving}
      onConfirm={async () => {
        if (!pending) return;
        await onSave(pending);
        reset(cleanRawMaterialForForm(pending)); // limpia "cambios sin guardar" al toque, sin esperar el refetch
        void registerTrazableMovements(pending);
        setPending(null);
      }}
      onCancel={() => setPending(null)}
    />

    <ImputacionModal
      open={!!currentImputacion}
      detail={currentImputacion?.detail}
      options={currentImputacion?.options ?? []}
      loading={imputar.isPending}
      onChoose={async (periodo) => {
        if (!currentImputacion) return;
        await Promise.all(
          currentImputacion.dataPointIds.map((id) => imputar.mutateAsync({ dataPointId: id, periodo, sourceArea: 'costista' })),
        );
        setImputacionQueue((q) => q.slice(1));
      }}
      onCancel={() => setImputacionQueue((q) => q.slice(1))}
    />
    </>
  );
}

export function emptyRawMaterial(): RawMaterialConfig {
  return {
    wilson: { annualDemand: 0, orderCost: 0, holdingRate: 0, unitCost: 0 },
    stockPolicy: { minConsumption: 0, maxConsumption: 0, minLeadTime: 0, maxLeadTime: 0, safetyStock: 0 },
    initialStock: { quantity: 0, unitCost: 0 },
    movements: [],
  };
}
