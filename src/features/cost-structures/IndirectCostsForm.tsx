import { useEffect, Fragment } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { IndirectCostConfig } from './cost-structure-types';

interface Props {
  defaultValues?: IndirectCostConfig;
  onSave: (data: IndirectCostConfig) => Promise<void>;
  saving: boolean;
}

export function IndirectCostsForm({ defaultValues, onSave, saving }: Props) {
  const { register, control, handleSubmit, reset } = useForm<IndirectCostConfig>({
    defaultValues: defaultValues ?? emptyIndirectCosts(),
  });

  useEffect(() => {
    if (defaultValues) reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields: centers, append: addCenter, remove: removeCenter } = useFieldArray({ control, name: 'centers' });
  const { fields: concepts, append: addConcept, remove: removeConcept } = useFieldArray({ control, name: 'concepts' });
  const { fields: serviceDists, append: addServiceDist, remove: removeServiceDist } = useFieldArray({ control, name: 'serviceDistributions' });
  const { fields: prodSettings, append: addProdSetting, remove: removeProdSetting } = useFieldArray({ control, name: 'productiveSettings' });

  // Watch centers to generate distribution columns
  const watchedCenters = useWatch({ control, name: 'centers' });
  const productiveCenters = watchedCenters?.filter((c) => c.type === 'productive') ?? [];
  const serviceCenters = watchedCenters?.filter((c) => c.type === 'service') ?? [];

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6 pt-3">
      {/* Centros de costo */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Centros de costo</h4>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => addCenter({ id: `prod${centers.length + 1}`, name: '', type: 'productive' })}>
              <Plus className="size-3" /> Productivo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => addCenter({ id: `serv${centers.length + 1}`, name: '', type: 'service' })}>
              <Plus className="size-3" /> Servicio
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
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
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Conceptos de CIF y prorrateo primario (%)</h4>
          <Button type="button" size="sm" variant="secondary" onClick={() => addConcept({ name: '', amount: { fixed: 0, variable: 0 }, distribution: {} })}>
            <Plus className="size-3" /> Concepto
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Concepto</th>
                <th className="px-3 py-2 text-right font-medium">Fijo $</th>
                <th className="px-3 py-2 text-right font-medium">Variable $</th>
                {watchedCenters?.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-right font-medium">{c.name || c.id} %</th>
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
                      <input type="number" step="0.1" min="0" max="100" className="w-16 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`concepts.${i}.distribution.${c.id}`, { valueAsNumber: true })} />
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
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Prorrateo secundario — distribución de servicios (%)
            </h4>
            <Button type="button" size="sm" variant="secondary" onClick={() => addServiceDist({ serviceCenterId: '', toProductiveFixed: {}, toProductiveVariable: {} })}>
              <Plus className="size-3" /> Agregar
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left font-medium border-b border-line" rowSpan={2}>Centro de servicio</th>
                  {productiveCenters.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-center font-medium border-b border-line" colSpan={2}>{c.name || c.id}</th>
                  ))}
                  <th className="px-3 py-2 border-b border-line" rowSpan={2} />
                </tr>
                <tr>
                  {productiveCenters.map((c) => (
                    <Fragment key={c.id}>
                      <th className="px-3 py-1 text-right font-medium text-[10px] text-ink-soft border-b border-line">Fijo %</th>
                      <th className="px-3 py-1 text-right font-medium text-[10px] text-ink-soft border-b border-line">Var %</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {serviceDists.map((f, i) => (
                  <tr key={f.id}>
                    <td className="px-2 py-1.5">
                      <select className="rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`serviceDistributions.${i}.serviceCenterId`)}>
                        <option value="">Elegir…</option>
                        {serviceCenters.map((c) => (
                          <option key={c.id} value={c.id}>{c.name || c.id}</option>
                        ))}
                      </select>
                    </td>
                    {productiveCenters.map((c) => (
                      <Fragment key={c.id}>
                        <td className="px-1 py-1.5">
                          <input type="number" step="0.1" min="0" max="100" className="w-16 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveFixed.${c.id}`, { valueAsNumber: true })} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input type="number" step="0.1" min="0" max="100" className="w-16 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveVariable.${c.id}`, { valueAsNumber: true })} />
                        </td>
                      </Fragment>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => removeServiceDist(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Configuración por centro productivo */}
      {productiveCenters.length > 0 && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Cuotas y variaciones por centro productivo
          </h4>
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Centro</th>
                  <th className="px-3 py-2 text-right font-medium">Presup. fijo $</th>
                  <th className="px-3 py-2 text-right font-medium">Presup. variable $</th>
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
                        {productiveCenters.map((c) => (
                          <option key={c.id} value={c.id}>{c.name || c.id}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.budget.fixed`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.budget.variable`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="1" className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.normalCapacity`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="1" className="w-24 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.actualActivity`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" className="w-28 rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none" {...register(`productiveSettings.${i}.actualCip`, { valueAsNumber: true })} /></td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => removeProdSetting(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
                {prodSettings.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-[13px] text-ink-soft">Agregá una fila por cada centro productivo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => addProdSetting({ centerId: '', budget: { fixed: 0, variable: 0 }, normalCapacity: 0, actualActivity: 0, actualCip: 0 })}
          >
            <Plus className="size-3" /> Agregar centro
          </Button>
        </section>
      )}

      <Button type="submit" loading={saving} className="w-full">
        Guardar Costos Indirectos
      </Button>
    </form>
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
