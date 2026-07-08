import { useEffect, useState, useRef, Fragment } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { IndirectCostConfig } from './cost-structure-types';

/** Formatea un importe derivado (presupuesto del prorrateo) para mostrarlo. */
function fmtBudget(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFinite(n) || n === 0) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface Props {
  defaultValues?: IndirectCostConfig;
  onSave: (data: IndirectCostConfig) => Promise<void>;
  saving: boolean;
}

function cleanIndirectCostsForForm(cfg?: IndirectCostConfig): any {
  const base = cfg ?? emptyIndirectCosts();

  const cleanRecord = (rec?: Record<string, number>) => {
    if (!rec) return {};
    const res: Record<string, any> = {};
    for (const k in rec) {
      res[k] = rec[k] === 0 ? '' : rec[k];
    }
    return res;
  };

  return {
    centers: base.centers ?? [],
    concepts: (base.concepts ?? []).map((c) => ({
      ...c,
      amount: {
        fixed: c.amount?.fixed === 0 ? '' : (c.amount?.fixed ?? ''),
        variable: c.amount?.variable === 0 ? '' : (c.amount?.variable ?? ''),
      },
      distribution: cleanRecord(c.distribution),
    })),
    serviceDistributions: (base.serviceDistributions ?? []).map((s) => ({
      ...s,
      toProductiveFixed: cleanRecord(s.toProductiveFixed),
      toProductiveVariable: cleanRecord(s.toProductiveVariable),
    })),
    productiveSettings: (base.productiveSettings ?? []).map((p) => ({
      ...p,
      budget: {
        fixed: p.budget?.fixed === 0 ? '' : (p.budget?.fixed ?? ''),
        variable: p.budget?.variable === 0 ? '' : (p.budget?.variable ?? ''),
      },
      normalCapacity: p.normalCapacity === 0 ? '' : (p.normalCapacity ?? ''),
      actualActivity: p.actualActivity === 0 ? '' : (p.actualActivity ?? ''),
      actualCip: p.actualCip === 0 ? '' : (p.actualCip ?? ''),
    })),
  };
}

function cleanIndirectCostsForSubmit(data: any): IndirectCostConfig {
  const fallbackNum = (val: any) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
    return Number(val);
  };

  const cleanRecord = (rec?: Record<string, any>) => {
    if (!rec) return {};
    const res: Record<string, number> = {};
    for (const k in rec) {
      res[k] = fallbackNum(rec[k]);
    }
    return res;
  };

  return {
    centers: data.centers ?? [],
    concepts: (data.concepts ?? []).map((c: any) => ({
      ...c,
      amount: {
        fixed: fallbackNum(c.amount?.fixed),
        variable: fallbackNum(c.amount?.variable),
      },
      distribution: cleanRecord(c.distribution),
    })),
    serviceDistributions: (data.serviceDistributions ?? []).map((s: any) => ({
      ...s,
      toProductiveFixed: cleanRecord(s.toProductiveFixed),
      toProductiveVariable: cleanRecord(s.toProductiveVariable),
    })),
    productiveSettings: (data.productiveSettings ?? []).map((p: any) => ({
      ...p,
      budget: {
        fixed: fallbackNum(p.budget?.fixed),
        variable: fallbackNum(p.budget?.variable),
      },
      normalCapacity: fallbackNum(p.normalCapacity),
      actualActivity: fallbackNum(p.actualActivity),
      actualCip: fallbackNum(p.actualCip),
    })),
  };
}

export function IndirectCostsForm({ defaultValues, onSave, saving }: Props) {
  const { register, control, handleSubmit, reset, getValues, formState: { isDirty } } = useForm<IndirectCostConfig>({
    defaultValues: cleanIndirectCostsForForm(defaultValues) as any,
  });

  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!defaultValues) return;
    const snapshot = JSON.stringify(defaultValues);
    if (snapshot === loadedRef.current) return;
    loadedRef.current = snapshot;
    reset(cleanIndirectCostsForForm(defaultValues));
  }, [defaultValues, reset]);

  const [pending, setPending] = useState<IndirectCostConfig | null>(null);

  const { fields: centers, append: addCenter, remove: removeCenter } = useFieldArray({ control, name: 'centers' });
  const { fields: concepts, append: addConcept, remove: removeConcept } = useFieldArray({ control, name: 'concepts' });
  const { fields: serviceDists, append: addServiceDist, remove: removeServiceDist } = useFieldArray({ control, name: 'serviceDistributions' });
  const { fields: prodSettings, append: addProdSetting, remove: removeProdSetting } = useFieldArray({ control, name: 'productiveSettings' });

  // Pegado rápido desde Excel
  const [showPasteConcepts, setShowPasteConcepts] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    try {
      const lines = pasteText.split('\n').filter(l => l.trim() !== '');
      const parsedConcepts = lines.map((line, idx) => {
        const parts = line.split('\t');
        if (parts.length < 3) {
          throw new Error(`Fila ${idx + 1}: Debe tener al menos Concepto, Monto Fijo y Monto Variable.`);
        }
        const [name, fixedStr, varStr, ...distStrs] = parts;
        const fixedVal = fixedStr?.trim();
        const varVal = varStr?.trim();
        const fixed = !fixedVal || isNaN(Number(fixedVal)) ? 0 : Number(fixedVal);
        const variable = !varVal || isNaN(Number(varVal)) ? 0 : Number(varVal);

        const distribution: Record<string, number> = {};
        watchedCenters?.forEach((center, cIdx) => {
          const val = distStrs[cIdx];
          if (val && !isNaN(Number(val.trim()))) {
            distribution[center.id] = Number(val.trim());
          }
        });

        return {
          name: name?.trim() || '',
          amount: { fixed, variable },
          distribution,
        };
      });

      parsedConcepts.forEach(c => addConcept(c));
      setPasteText('');
      setPasteError(null);
      setShowPasteConcepts(false);
    } catch (e: any) {
      setPasteError(e.message || 'Error al parsear el texto de Excel.');
    }
  };

  const watchedCenters = useWatch({ control, name: 'centers' });
  const watchedProdSettings = useWatch({ control, name: 'productiveSettings' });
  const watchedServiceDists = useWatch({ control, name: 'serviceDistributions' });
  const productiveCenters = watchedCenters?.filter((c) => c.type === 'productive') ?? [];
  const serviceCenters = watchedCenters?.filter((c) => c.type === 'service') ?? [];

  // Auto-sync serviceDistributions when service centers change
  const prevServiceKey = useRef('');
  const serviceIdKey = serviceCenters.map(c => c.id).join(',');
  useEffect(() => {
    if (serviceIdKey === prevServiceKey.current) return;
    prevServiceKey.current = serviceIdKey;

    const currentDists: any[] = getValues('serviceDistributions') ?? [];
    const existingIds = new Set(currentDists.map((d) => d.serviceCenterId));
    const targetIds = new Set(serviceCenters.map(c => c.id));

    for (const center of serviceCenters) {
      if (!existingIds.has(center.id)) {
        addServiceDist({ serviceCenterId: center.id, toProductiveFixed: {}, toProductiveVariable: {} });
      }
    }
    for (let i = currentDists.length - 1; i >= 0; i--) {
      if (currentDists[i]?.serviceCenterId && !targetIds.has(currentDists[i].serviceCenterId)) {
        removeServiceDist(i);
      }
    }
  }, [serviceIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync productiveSettings when productive centers change
  const prevProductiveKey = useRef('');
  const productiveIdKey = productiveCenters.map(c => c.id).join(',');
  useEffect(() => {
    if (productiveIdKey === prevProductiveKey.current) return;
    prevProductiveKey.current = productiveIdKey;

    const currentSettings: any[] = getValues('productiveSettings') ?? [];
    const existingIds = new Set(currentSettings.map((p) => p.centerId));
    const targetIds = new Set(productiveCenters.map(c => c.id));

    for (const center of productiveCenters) {
      if (!existingIds.has(center.id)) {
        addProdSetting({ centerId: center.id, budget: { fixed: 0, variable: 0 }, normalCapacity: 0, actualActivity: 0, actualCip: 0 });
      }
    }
    for (let i = currentSettings.length - 1; i >= 0; i--) {
      if (currentSettings[i]?.centerId && !targetIds.has(currentSettings[i].centerId)) {
        removeProdSetting(i);
      }
    }
  }, [productiveIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <form onSubmit={handleSubmit((data) => setPending(cleanIndirectCostsForSubmit(data)))} className="space-y-6 pt-3">
      {/* Centros de costo */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Centros de costo</h4>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => addCenter({ id: `prod${centers.length + 1}`, name: '', type: 'productive' })}>
              <Plus className="size-3" /> Productivo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => addCenter({ id: `serv${centers.length + 1}`, name: '', type: 'service' })}>
              <Plus className="size-3" /> Servicio
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {centers.map((f, i) => (
                <tr key={f.id}>
                  <td className="px-2 py-1.5">
                    <input className="w-24 rounded border border-line bg-surface px-2 py-1 text-sm font-mono text-ink focus:border-granate focus:outline-none" placeholder="prod1" {...register(`centers.${i}.id`)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre del centro" {...register(`centers.${i}.name`)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select className="rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`centers.${i}.type`)}>
                      <option value="productive">Productivo</option>
                      <option value="service">Servicio</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => removeCenter(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {centers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-ink-soft">Agregá al menos un centro productivo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Conceptos de CIF */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">Conceptos de CIF y prorrateo primario (%)</h4>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowPasteConcepts(!showPasteConcepts)}>
              Pegar de Excel
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => addConcept({ name: '', amount: { fixed: 0, variable: 0 }, distribution: {} })}>
              <Plus className="size-3" /> Concepto
            </Button>
          </div>
        </div>

        {showPasteConcepts && (
          <div className="mb-4 rounded-xl border border-line bg-surface-alt p-4 space-y-3 animate-rise">
            <p className="text-[11px] text-ink-soft">
              Copiá las columnas de tu Excel (Concepto, Fijo, Variable, y luego los porcentajes correspondientes a cada centro de costo) y pegalas abajo:
            </p>
            <textarea
              className="w-full h-24 rounded-xl border border-line bg-surface p-2 text-xs font-mono outline-none focus:border-granate text-ink"
              placeholder={`Ejemplo:\nAlquiler\t150000\t0\t60\t40\nFuerza Motriz\t0\t80000\t70\t30`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {pasteError && <p className="text-xs text-danger">{pasteError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowPasteConcepts(false); setPasteError(null); }}>Cancelar</Button>
              <Button type="button" size="sm" onClick={handlePasteImport}>Procesar e Importar</Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Concepto</th>
                <th className="px-3 py-2 text-right font-medium">Fijo $</th>
                <th className="px-3 py-2 text-right font-medium">Variable $</th>
                {watchedCenters?.map((c) => (
                  <th key={c.id} className="w-20 px-3 py-2 text-right font-medium">{c.name || c.id} %</th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {concepts.map((f, i) => (
                <tr key={f.id}>
                  <td className="px-2 py-1.5">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Alquiler, Energía…" {...register(`concepts.${i}.name`)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`concepts.${i}.amount.fixed`, { valueAsNumber: true })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`concepts.${i}.amount.variable`, { valueAsNumber: true })} />
                  </td>
                  {watchedCenters?.map((c) => (
                    <td key={c.id} className="px-2 py-1.5">
                      <input type="number" step="any" min="0" max="100" className="w-20 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`concepts.${i}.distribution.${c.id}`, { valueAsNumber: true })} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => removeConcept(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {concepts.length === 0 && (
                <tr><td colSpan={5 + (watchedCenters?.length ?? 0)} className="px-4 py-6 text-center text-[13px] text-ink-soft">Sin conceptos. Agregá los costos indirectos de fabricación.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">Los porcentajes por centro deben sumar 100 en cada fila.</p>
      </section>

      {/* Distribuciones de centros de servicio */}
      {serviceCenters.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
              Prorrateo secundario — distribución de servicios (%)
            </h4>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="w-40 px-3 py-2 text-left font-medium" rowSpan={2}>Centro de servicio</th>
                  {productiveCenters.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-center font-medium" colSpan={2}>{c.name || c.id}</th>
                  ))}
                  <th className="w-8 px-3 py-2" rowSpan={2} />
                </tr>
                <tr>
                  {productiveCenters.map((c) => (
                    <Fragment key={c.id}>
                      <th className="w-20 px-3 py-1 text-center font-medium text-[10px] text-ink-soft border-t border-line">Fijo %</th>
                      <th className="w-20 px-3 py-1 text-center font-medium text-[10px] text-ink-soft border-t border-line">Var %</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {serviceDists.map((f, i) => (
                  <tr key={f.id}>
                    <td className="px-2 py-1.5">
                      <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`serviceDistributions.${i}.serviceCenterId`)}>
                        <option value="">Elegir…</option>
                        {serviceCenters
                          .filter(c => {
                            const usedInOtherRows = (watchedServiceDists ?? [])
                              .some((d, j) => j !== i && d.serviceCenterId === c.id);
                            return !usedInOtherRows;
                          })
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name || c.id}</option>
                          ))}
                      </select>
                    </td>
                    {productiveCenters.map((c) => (
                      <Fragment key={c.id}>
                        <td className="px-1 py-1.5 text-center">
                          <input type="number" step="any" min="0" max="100" className="w-20 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveFixed.${c.id}`, { valueAsNumber: true })} />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <input type="number" step="any" min="0" max="100" className="w-20 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveVariable.${c.id}`, { valueAsNumber: true })} />
                        </td>
                      </Fragment>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => removeServiceDist(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
                {serviceDists.length === 0 && (
                  <tr><td colSpan={1 + productiveCenters.length * 2 + 1} className="px-4 py-6 text-center text-[13px] text-ink-soft">Cargando distribuciones…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Configuración por centro productivo */}
      {productiveCenters.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => addProdSetting({ centerId: '', budget: { fixed: 0, variable: 0 }, normalCapacity: 0, actualActivity: 0, actualCip: 0 })}
            >
              <Plus className="size-3" /> Agregar
            </Button>
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
              Cuotas y variaciones por centro productivo
            </h4>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Centro</th>
                  <th className="bg-surface-alt/60 px-3 py-2 text-right font-medium text-action">
                    <span className="inline-flex items-center justify-end gap-1">
                      <Lock className="size-3" /> Presup. fijo $
                    </span>
                  </th>
                  <th className="bg-surface-alt/60 px-3 py-2 text-right font-medium text-action">
                    <span className="inline-flex items-center justify-end gap-1">
                      <Lock className="size-3" /> Presup. variable $
                    </span>
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Cap. normal (hs)</th>
                  <th className="px-3 py-2 text-right font-medium">Actividad real (hs)</th>
                  <th className="px-3 py-2 text-right font-medium">CIP real $</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {prodSettings.map((f, i) => (
                  <tr key={f.id}>
                    <td className="px-2 py-1.5">
                      <select className="rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.centerId`)}>
                        <option value="">Elegir…</option>
                        {productiveCenters
                          .filter(c => {
                            const usedInOtherRows = (watchedProdSettings ?? [])
                              .some((p, j) => j !== i && p.centerId === c.id);
                            return !usedInOtherRows;
                          })
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name || c.id}</option>
                          ))}
                      </select>
                    </td>
                    <td className="bg-surface-alt/40 px-2 py-1.5">
                      <div className="flex w-28 items-center justify-end gap-1 rounded border border-dashed border-action/30 bg-surface-alt px-2 py-1 text-right font-mono text-sm text-ink-soft" title="Calculado automáticamente por el prorrateo (no editable)">
                        <Lock className="size-3 shrink-0 text-action/50" />
                        <span>{fmtBudget(watchedProdSettings?.[i]?.budget?.fixed)}</span>
                      </div>
                      <input type="hidden" {...register(`productiveSettings.${i}.budget.fixed`, { valueAsNumber: true })} />
                    </td>
                    <td className="bg-surface-alt/40 px-2 py-1.5">
                      <div className="flex w-28 items-center justify-end gap-1 rounded border border-dashed border-action/30 bg-surface-alt px-2 py-1 text-right font-mono text-sm text-ink-soft" title="Calculado automáticamente por el prorrateo (no editable)">
                        <Lock className="size-3 shrink-0 text-action/50" />
                        <span>{fmtBudget(watchedProdSettings?.[i]?.budget?.variable)}</span>
                      </div>
                      <input type="hidden" {...register(`productiveSettings.${i}.budget.variable`, { valueAsNumber: true })} />
                    </td>
                    <td className="px-2 py-1.5"><input type="number" step="1" className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.normalCapacity`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="1" className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.actualActivity`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.actualCip`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => removeProdSetting(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
                {prodSettings.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-[13px] text-ink-soft">Cargando centros…</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-soft">
            <Lock className="size-3 text-action/60" />
            El <strong className="font-medium text-action">presupuesto fijo/variable</strong> se calcula automáticamente con el prorrateo (primario + cierre del secundario) al guardar. Solo cargás capacidad normal, actividad real y CIP real.
          </p>
        </section>
      )}

      <div className="space-y-2">
        {isDirty && (
          <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-warn">
            <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
          </p>
        )}
        <Button type="submit" loading={saving} className="w-full">
          Guardar Costos Indirectos
        </Button>
      </div>
    </form>

    <ConfirmDialog
      open={!!pending}
      title="Actualizar Costos Indirectos"
      message="¿Querés actualizar los datos de Costos Indirectos de Producción?"
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

export function emptyIndirectCosts(): IndirectCostConfig {
  return {
    centers: [],
    concepts: [],
    serviceDistributions: [],
    productiveSettings: [],
  };
}
