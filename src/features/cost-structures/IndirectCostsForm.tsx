import { useEffect, useState, useRef, Fragment } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { IndirectCostConfig } from './cost-structure-types';
import { useAllocationBases, useCreateAllocationBase, type AllocationBase } from './allocation-base-hooks';

/**
 * Desplegable de bases de asignación (3b-1). Reemplaza el texto libre: el
 * costista elige una base del catálogo (sistema + propias) o crea una nueva.
 * El valor seleccionado es el `code` de la base (lo que el motor resuelve).
 */
function BaseSelect({ bases, value, companyId, onSelect }: {
  bases: AllocationBase[] | undefined;
  value: string;
  companyId?: string;
  onSelect: (code: string) => void;
}) {
  const list = bases ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const create = useCreateAllocationBase();

  const inCatalog = list.some((b) => b.code === value);

  // Genera un código estable a partir del nombre (sin acentos ni espacios).
  const slug = (s: string) =>
    s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

  const handleCreate = async () => {
    if (!companyId) { setErr('No se pudo identificar la empresa.'); return; }
    const name = newName.trim();
    const unit = newUnit.trim();
    if (!name || !unit) { setErr('Poné un nombre y una unidad.'); return; }
    const code = slug(name);
    if (!code) { setErr('El nombre no es válido.'); return; }
    try {
      const base = await create.mutateAsync({ companyId, code, name, unit });
      onSelect(base.code);
      setShowCreate(false); setNewName(''); setNewUnit(''); setErr(null);
    } catch {
      setErr('No se pudo crear la base. Puede que ya exista una con ese nombre.');
    }
  };

  return (
    <div className="space-y-1.5">
      <select
        value={value || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__new__') { setShowCreate(true); return; }
          onSelect(v);
        }}
        className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-56"
      >
        <option value="">Elegir base…</option>
        {list.map((b) => (
          <option key={b.id} value={b.code}>
            {b.name}{b.unit ? ` (${b.unit})` : ''}{b.isSystem ? '' : ' · propia'}
          </option>
        ))}
        {value && !inCatalog && <option value={value}>{value} (fuera del catálogo)</option>}
        <option value="__new__">+ Crear base nueva…</option>
      </select>

      {showCreate && (
        <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2">
          <div className="flex flex-wrap gap-1.5">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre (ej. Superficie)" className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" />
            <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unidad (ej. m²)" className="w-28 rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" />
          </div>
          {err && <p className="text-[11px] text-danger">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowCreate(false); setErr(null); }}>Cancelar</Button>
            <Button type="button" size="sm" loading={create.isPending} onClick={handleCreate}>Crear base</Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  /** Empresa dueña de la estructura: sirve para traer su catálogo de bases. */
  companyId?: string;
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
      allocationMode: c.allocationMode === 'base' ? 'base' : 'percent',
      baseCode: c.baseCode ?? '',
      amount: {
        fixed: c.amount?.fixed === 0 ? '' : (c.amount?.fixed ?? ''),
        variable: c.amount?.variable === 0 ? '' : (c.amount?.variable ?? ''),
      },
      distribution: cleanRecord(c.distribution),
    })),
    serviceDistributions: (base.serviceDistributions ?? []).map((s) => ({
      ...s,
      distributionMode: s.distributionMode ?? 'manual',
      baseCode: s.baseCode ?? '',
      toProductive: cleanRecord(s.toProductive),
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
    concepts: (data.concepts ?? []).map((c: any) => {
      const mode = c.allocationMode === 'base' ? 'base' : 'percent';
      const common = {
        name: c.name,
        amount: { fixed: fallbackNum(c.amount?.fixed), variable: fallbackNum(c.amount?.variable) },
        allocationMode: mode,
        // En 'base', distribution guarda las UNIDADES de la base; en 'percent',
        // los % tipeados. En ambos casos se limpian los vacíos a 0.
        distribution: cleanRecord(c.distribution),
      };
      return mode === 'base' ? { ...common, baseCode: (c.baseCode ?? '').trim() } : common;
    }),
    serviceDistributions: (data.serviceDistributions ?? []).map((s: any) => {
      const mode = s.distributionMode === 'base' ? 'base' : 'manual';
      if (mode === 'base') {
        // Modo automático: el reparto sale de las UNIDADES de la base (una por
        // centro). Se limpian los % manuales para que el motor use toProductive.
        return {
          serviceCenterId: s.serviceCenterId,
          distributionMode: 'base',
          baseCode: (s.baseCode ?? '').trim(),
          toProductive: cleanRecord(s.toProductive),
          toProductiveFixed: {},
          toProductiveVariable: {},
        };
      }
      // Modo manual: % tipeados. Se limpia toProductive (evita drivers viejos).
      return {
        serviceCenterId: s.serviceCenterId,
        distributionMode: 'manual',
        toProductive: {},
        toProductiveFixed: cleanRecord(s.toProductiveFixed),
        toProductiveVariable: cleanRecord(s.toProductiveVariable),
      };
    }),
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
    // Orden de cierre = orden de las filas de servicios (Parte 4.4). Activa el
    // prorrateo escalonado. Retrocompatible: con un solo servicio o servicios
    // que solo reparten a productivos, el resultado es idéntico al directo.
    closureOrder: (data.serviceDistributions ?? [])
      .map((s: any) => s.serviceCenterId)
      .filter((x: string) => !!x),
  };
}

export function IndirectCostsForm({ defaultValues, onSave, saving, companyId }: Props) {
  const { register, control, handleSubmit, reset, getValues, setValue, formState: { isDirty } } = useForm<IndirectCostConfig>({
    defaultValues: cleanIndirectCostsForForm(defaultValues) as any,
  });

  // Catálogo de bases de asignación de la empresa (sistema + propias) para los
  // desplegables del modo "Automático (por base)".
  const { data: allocationBases } = useAllocationBases(companyId);

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
  const { fields: serviceDists, append: addServiceDist, remove: removeServiceDist, move: moveServiceDist } = useFieldArray({ control, name: 'serviceDistributions' });
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
  const watchedConcepts = useWatch({ control, name: 'concepts' });
  const watchedProdSettings = useWatch({ control, name: 'productiveSettings' });
  const watchedServiceDists = useWatch({ control, name: 'serviceDistributions' });
  const productiveCenters = watchedCenters?.filter((c) => c.type === 'productive') ?? [];
  const serviceCenters = watchedCenters?.filter((c) => c.type === 'service') ?? [];
  // Destinos del secundario = productivos + servicios. Un servicio puede
  // repartir a otro servicio (que aún no cerró): así funciona el escalonado.
  // En cada fila, la columna del propio servicio queda deshabilitada.
  const targetCenters = [...productiveCenters, ...serviceCenters];

  // % derivado de una base (unidad del centro ÷ Σ unidades). Solo para mostrar
  // en vivo en el modo automático; el motor lo recalcula igual al guardar.
  const driverPct = (drivers: Record<string, any> | undefined, centerId: string): string => {
    if (!drivers) return '—';
    const total = Object.values(drivers).reduce((a: number, v) => a + (Number(v) || 0), 0);
    const val = Number(drivers[centerId]) || 0;
    if (total <= 0 || val <= 0) return '—';
    return `${((val / total) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
  };

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
        addServiceDist({ serviceCenterId: center.id, distributionMode: 'manual', baseCode: '', toProductive: {}, toProductiveFixed: {}, toProductiveVariable: {} });
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
        <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
          <table className="block w-full text-sm sm:table">
            <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
              {centers.map((f, i) => (
                <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                  <td data-label="ID" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm font-mono text-ink focus:border-granate focus:outline-none sm:w-24" placeholder="prod1" {...register(`centers.${i}.id`)} />
                  </td>
                  <td data-label="Nombre" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Nombre del centro" {...register(`centers.${i}.name`)} />
                  </td>
                  <td data-label="Tipo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-auto" {...register(`centers.${i}.type`)}>
                      <option value="productive">Productivo</option>
                      <option value="service">Servicio</option>
                    </select>
                  </td>
                  <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                    <button type="button" onClick={() => removeCenter(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {centers.length === 0 && (
                <tr className="block sm:table-row"><td colSpan={4} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Agregá al menos un centro productivo.</td></tr>
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
            <Button type="button" size="sm" variant="secondary" onClick={() => addConcept({ name: '', amount: { fixed: 0, variable: 0 }, distribution: {}, allocationMode: 'percent', baseCode: '' })}>
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
        <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
          <table className="block w-full text-sm sm:table">
            <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Concepto</th>
                <th className="px-3 py-2 text-right font-medium">Fijo $</th>
                <th className="px-3 py-2 text-right font-medium">Variable $</th>
                <th className="w-36 px-3 py-2 text-left font-medium">Modo</th>
                {watchedCenters?.map((c) => (
                  <th key={c.id} className="w-20 px-3 py-2 text-right font-medium">{c.name || c.id} (base)</th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
              {concepts.map((f, i) => {
                const cMode = (watchedConcepts ?? [])[i]?.allocationMode === 'base' ? 'base' : 'percent';
                const cDrivers = (watchedConcepts ?? [])[i]?.distribution as Record<string, any> | undefined;
                return (
                <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                  <td data-label="Concepto" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" placeholder="Alquiler, Energía…" {...register(`concepts.${i}.name`)} />
                  </td>
                  <td data-label="Fijo $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-28" {...register(`concepts.${i}.amount.fixed`, { valueAsNumber: true })} />
                  </td>
                  <td data-label="Variable $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-28" {...register(`concepts.${i}.amount.variable`, { valueAsNumber: true })} />
                  </td>
                  <td data-label="Modo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                    <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`concepts.${i}.allocationMode`)}>
                      <option value="percent">Manual (%)</option>
                      <option value="base">Automático (por base)</option>
                    </select>
                  </td>
                  {cMode === 'base' ? (
                    <td colSpan={watchedCenters?.length ?? 1} className="block sm:table-cell sm:px-2 sm:py-1.5">
                      <div className="rounded-lg border border-dashed border-action/40 bg-surface-alt/40 p-2.5">
                        <div className="mb-2">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Base de distribución</span>
                          <input type="hidden" {...register(`concepts.${i}.baseCode`)} />
                          <BaseSelect
                            bases={allocationBases}
                            companyId={companyId}
                            value={(watchedConcepts ?? [])[i]?.baseCode ?? ''}
                            onSelect={(code) => setValue(`concepts.${i}.baseCode`, code, { shouldDirty: true })}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(watchedCenters ?? []).map((c) => (
                            <div key={c.id} className="flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1">
                              <span className="text-[12px] text-ink-soft">{c.name || c.id}</span>
                              <input type="number" step="any" inputMode="decimal" className="w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`concepts.${i}.distribution.${c.id}`, { valueAsNumber: true })} />
                              <span className="w-12 text-right text-[11px] font-medium text-action">{driverPct(cDrivers, c.id)}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[10.5px] text-ink-soft">Cargá la unidad de cada centro (ej. m²). El % se deriva solo (unidad ÷ total) y lo aplica el motor.</p>
                      </div>
                    </td>
                  ) : (
                    watchedCenters?.map((c) => (
                      <td key={c.id} data-label={`${c.name || c.id} %`} className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                        <input type="number" step="any" inputMode="decimal" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-20" placeholder="0" {...register(`concepts.${i}.distribution.${c.id}`, { valueAsNumber: true })} />
                      </td>
                    ))
                  )}
                  <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                    <button type="button" onClick={() => removeConcept(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
                );
              })}
              {concepts.length === 0 && (
                <tr className="block sm:table-row"><td colSpan={6 + (watchedCenters?.length ?? 0)} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Sin conceptos. Agregá los costos indirectos de fabricación.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">
          En modo <em>Manual (%)</em>, cargá un valor por centro para cada fila — no hace falta que sumen 100: el sistema reparte según la proporción entre centros (valor ÷ total de la fila). En modo <em>Automático (por base)</em>, elegís una base física (ej. superficie) y cargás la unidad de cada centro; el % lo deriva el sistema solo, de la misma forma.
        </p>
      </section>

      {/* Distribuciones de centros de servicio */}
      {serviceCenters.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">
              Prorrateo secundario — distribución de servicios (%)
            </h4>
          </div>
          <p className="mb-2 text-[11px] leading-snug text-ink-soft">
            <strong className="font-medium text-ink">El orden de las filas es el orden de cierre</strong> (método escalonado):
            el primero cierra primero. Un servicio puede repartir a otro servicio que <em>todavía no cerró</em> — no puede
            repartir a uno que ya cerró (por eso su columna aparece bloqueada más abajo). Usá las flechas para reordenar.
          </p>
          <p className="mb-2 text-[11px] leading-snug text-ink-soft">
            <strong className="font-medium text-ink">Modo de reparto</strong>: <em>Manual (%)</em> = tipeás los porcentajes por centro.
            <em> Automático (por base)</em> = elegís una base física (ej. horas-máquina) y cargás la unidad de cada centro; el porcentaje lo deriva el sistema solo.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
            <table className="block w-full text-sm sm:table">
              <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
                <tr>
                  <th className="w-8 px-2 py-2 text-center font-medium" rowSpan={2}>#</th>
                  <th className="w-40 px-3 py-2 text-left font-medium" rowSpan={2}>Centro de servicio</th>
                  <th className="w-36 px-3 py-2 text-left font-medium" rowSpan={2}>Modo</th>
                  {targetCenters.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-center font-medium" colSpan={2}>
                      {c.name || c.id}{c.type === 'service' && <span className="ml-1 text-[9px] text-ink-soft">(servicio)</span>}
                    </th>
                  ))}
                  <th className="w-8 px-3 py-2" rowSpan={2} />
                </tr>
                <tr>
                  {targetCenters.map((c) => (
                    <Fragment key={c.id}>
                      <th className="w-24 px-2 py-1 text-center font-medium text-[10px] text-ink-soft">Fijo %</th>
                      <th className="w-24 px-2 py-1 text-center font-medium text-[10px] text-ink-soft">Var %</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
                {serviceDists.map((f, i) => {
                  const rowServiceId = (watchedServiceDists ?? [])[i]?.serviceCenterId;
                  const rowMode = (watchedServiceDists ?? [])[i]?.distributionMode ?? 'manual';
                  const rowDrivers = (watchedServiceDists ?? [])[i]?.toProductive as Record<string, any> | undefined;
                  return (
                  <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <td data-label="Orden de cierre" className="flex items-center gap-1 before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-1 sm:py-1.5 sm:text-center sm:before:hidden">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-granate-tenue text-[11px] font-bold text-granate-deep">{i + 1}</span>
                      <span className="flex flex-col">
                        <button type="button" disabled={i === 0} onClick={() => moveServiceDist(i, i - 1)} className="text-ink-soft hover:text-granate disabled:opacity-20" aria-label="Subir">▲</button>
                        <button type="button" disabled={i === serviceDists.length - 1} onClick={() => moveServiceDist(i, i + 1)} className="text-ink-soft hover:text-granate disabled:opacity-20" aria-label="Bajar">▼</button>
                      </span>
                    </td>
                    <td data-label="Centro de servicio" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
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
                    <td data-label="Modo" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" {...register(`serviceDistributions.${i}.distributionMode`)}>
                        <option value="manual">Manual (%)</option>
                        <option value="base">Automático (por base)</option>
                      </select>
                    </td>
                    {rowMode === 'base' ? (
                      <td colSpan={targetCenters.length * 2} className="block sm:table-cell sm:px-2 sm:py-1.5">
                        <div className="rounded-lg border border-dashed border-action/40 bg-surface-alt/40 p-2.5">
                          <div className="mb-2">
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Base de distribución</span>
                            <input type="hidden" {...register(`serviceDistributions.${i}.baseCode`)} />
                            <BaseSelect
                              bases={allocationBases}
                              companyId={companyId}
                              value={(watchedServiceDists ?? [])[i]?.baseCode ?? ''}
                              onSelect={(code) => setValue(`serviceDistributions.${i}.baseCode`, code, { shouldDirty: true })}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {targetCenters.filter((c) => c.id !== rowServiceId).map((c) => (
                              <div key={c.id} className="flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1">
                                <span className="text-[12px] text-ink-soft">{c.name || c.id}</span>
                                <input type="number" step="any" inputMode="decimal" className="w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-right text-sm text-ink focus:border-granate focus:outline-none" placeholder="0" {...register(`serviceDistributions.${i}.toProductive.${c.id}`, { valueAsNumber: true })} />
                                <span className="w-12 text-right text-[11px] font-medium text-action">{driverPct(rowDrivers, c.id)}</span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-ink-soft">Cargá la unidad de cada centro (ej. horas). El % se deriva solo (unidad ÷ total) y lo aplica el motor al fijo y al variable.</p>
                        </div>
                      </td>
                    ) : (
                      targetCenters.map((c) => {
                      const isSelf = !!rowServiceId && c.id === rowServiceId;
                      return (
                      <Fragment key={c.id}>
                        <td data-label={`${c.name || c.id} — Fijo %`} className="block text-left before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-1 sm:py-1.5 sm:text-center sm:before:hidden">
                          {isSelf ? <span className="block text-center text-ink-soft/40">—</span> :
                          <input type="number" step="any" inputMode="decimal" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-20" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveFixed.${c.id}`, { valueAsNumber: true })} />}
                        </td>
                        <td data-label={`${c.name || c.id} — Var %`} className="block text-left before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-1 sm:py-1.5 sm:text-center sm:before:hidden">
                          {isSelf ? <span className="block text-center text-ink-soft/40">—</span> :
                          <input type="number" step="any" inputMode="decimal" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-20" placeholder="0" {...register(`serviceDistributions.${i}.toProductiveVariable.${c.id}`, { valueAsNumber: true })} />}
                        </td>
                      </Fragment>
                      );
                    })
                    )}
                    <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                      <button type="button" onClick={() => removeServiceDist(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                  );
                })}
                {serviceDists.length === 0 && (
                  <tr className="block sm:table-row"><td colSpan={3 + targetCenters.length * 2 + 1} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Cargando distribuciones…</td></tr>
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
          <div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-0">
            <table className="block w-full text-sm sm:table">
              <thead className="hidden bg-surface-alt text-[11px] uppercase tracking-wide text-ink-soft sm:table-header-group">
                <tr className="text-[10px]">
                  <th className="px-3 py-1.5" />
                  <th colSpan={3} className="px-3 py-1.5 text-center font-bold text-action">Presupuestado (calculado)</th>
                  <th colSpan={2} className="border-l-2 border-line px-3 py-1.5 text-center font-bold text-ink">Datos reales (fin de mes)</th>
                  <th className="px-3 py-1.5" />
                </tr>
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
                  <th className="border-l-2 border-line px-3 py-2 text-right font-medium">Actividad real (hs)</th>
                  <th className="px-3 py-2 text-right font-medium">CIP real $</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="flex flex-col gap-3 sm:table-row-group sm:gap-0 sm:divide-y sm:divide-line">
                {prodSettings.map((f, i) => (
                  <tr key={f.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:table-row sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <td data-label="Centro" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden">
                      <select className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-auto" {...register(`productiveSettings.${i}.centerId`)}>
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
                    <td data-label="Presup. fijo $ (calculado, no editable)" className="block rounded-lg bg-surface-alt/40 p-1.5 before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-action before:content-[attr(data-label)] sm:table-cell sm:rounded-none sm:bg-surface-alt/40 sm:px-2 sm:py-1.5 sm:before:hidden">
                      <div className="flex w-full items-center justify-end gap-1 rounded border border-dashed border-action/30 bg-surface-alt px-2 py-1 text-right font-mono text-sm text-ink-soft sm:w-28" title="Calculado automáticamente por el prorrateo (no editable)">
                        <Lock className="size-3 shrink-0 text-action/50" />
                        <span>{fmtBudget(watchedProdSettings?.[i]?.budget?.fixed)}</span>
                      </div>
                      <input type="hidden" {...register(`productiveSettings.${i}.budget.fixed`, { valueAsNumber: true })} />
                    </td>
                    <td data-label="Presup. variable $ (calculado, no editable)" className="block rounded-lg bg-surface-alt/40 p-1.5 before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-action before:content-[attr(data-label)] sm:table-cell sm:rounded-none sm:bg-surface-alt/40 sm:px-2 sm:py-1.5 sm:before:hidden">
                      <div className="flex w-full items-center justify-end gap-1 rounded border border-dashed border-action/30 bg-surface-alt px-2 py-1 text-right font-mono text-sm text-ink-soft sm:w-28" title="Calculado automáticamente por el prorrateo (no editable)">
                        <Lock className="size-3 shrink-0 text-action/50" />
                        <span>{fmtBudget(watchedProdSettings?.[i]?.budget?.variable)}</span>
                      </div>
                      <input type="hidden" {...register(`productiveSettings.${i}.budget.variable`, { valueAsNumber: true })} />
                    </td>
                    <td data-label="Cap. normal (hs)" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden"><input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-24" {...register(`productiveSettings.${i}.normalCapacity`, { valueAsNumber: true })} /></td>
                    <td data-label="Actividad real (hs) — fin de mes" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:border-l-2 sm:border-line sm:px-2 sm:py-1.5 sm:before:hidden"><input type="number" step="1" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-24" {...register(`productiveSettings.${i}.actualActivity`, { valueAsNumber: true })} /></td>
                    <td data-label="CIP real $" className="block before:block before:mb-1 before:text-[10px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-soft before:content-[attr(data-label)] sm:table-cell sm:px-2 sm:py-1.5 sm:before:hidden"><input type="number" step="0.01" className="w-full rounded border border-line bg-surface px-2 py-1 text-right text-sm text-ink focus:border-granate focus:outline-none sm:w-28" {...register(`productiveSettings.${i}.actualCip`, { valueAsNumber: true })} /></td>
                    <td className="flex justify-end sm:table-cell sm:px-2 sm:py-1.5 sm:text-center">
                      <button type="button" onClick={() => removeProdSetting(i)} className="text-ink-soft hover:text-danger"><Trash2 className="size-4" /></button>
                    </td>
                  </tr>
                ))}
                {prodSettings.length === 0 && (
                  <tr className="block sm:table-row"><td colSpan={7} className="block px-4 py-6 text-center text-[13px] text-ink-soft sm:table-cell">Cargando centros…</td></tr>
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
        reset(cleanIndirectCostsForForm(pending)); // limpia "cambios sin guardar" al toque, sin esperar el refetch
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
