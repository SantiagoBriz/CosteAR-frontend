import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { IndirectCostConfig } from './cost-structure-types';
import { useAllocationBases } from './allocation-base-hooks';
import { cleanIndirectCostsForForm, cleanIndirectCostsForSubmit } from './components/indirect-costs/helpers';
import { CostCentersSection } from './components/indirect-costs/CostCentersSection';
import { PrimaryAllocationSection } from './components/indirect-costs/PrimaryAllocationSection';
import { SecondaryAllocationSection } from './components/indirect-costs/SecondaryAllocationSection';
import { ProductiveSettingsSection } from './components/indirect-costs/ProductiveSettingsSection';

interface Props {
  defaultValues?: IndirectCostConfig;
  onSave: (data: IndirectCostConfig) => Promise<void>;
  saving: boolean;
  companyId?: string;
}

export function IndirectCostsForm({ defaultValues, onSave, saving, companyId }: Props) {
  const { register, control, handleSubmit, reset, getValues, setValue, formState: { isDirty } } = useForm<IndirectCostConfig>({
    defaultValues: cleanIndirectCostsForForm(defaultValues) as any,
  });

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

  const centers = useFieldArray({ control, name: 'centers' });
  const concepts = useFieldArray({ control, name: 'concepts' });
  const serviceDists = useFieldArray({ control, name: 'serviceDistributions' });
  const prodSettings = useFieldArray({ control, name: 'productiveSettings' });

  const watchedCenters = useWatch({ control, name: 'centers' });
  const watchedConcepts = useWatch({ control, name: 'concepts' });
  const watchedProdSettings = useWatch({ control, name: 'productiveSettings' });
  const watchedServiceDists = useWatch({ control, name: 'serviceDistributions' });
  const productiveCenters = watchedCenters?.filter((c) => c.type === 'productive') ?? [];
  const serviceCenters = watchedCenters?.filter((c) => c.type === 'service') ?? [];
  const targetCenters = [...productiveCenters, ...serviceCenters];

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
        serviceDists.append({ serviceCenterId: center.id, distributionMode: 'manual', baseCode: '', toProductive: {}, toProductiveFixed: {}, toProductiveVariable: {} });
      }
    }
    for (let i = currentDists.length - 1; i >= 0; i--) {
      if (currentDists[i]?.serviceCenterId && !targetIds.has(currentDists[i].serviceCenterId)) {
        serviceDists.remove(i);
      }
    }
  }, [serviceIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
        prodSettings.append({ centerId: center.id, budget: { fixed: 0, variable: 0 }, normalCapacity: 0, actualActivity: 0, actualCip: 0 });
      }
    }
    for (let i = currentSettings.length - 1; i >= 0; i--) {
      if (currentSettings[i]?.centerId && !targetIds.has(currentSettings[i].centerId)) {
        prodSettings.remove(i);
      }
    }
  }, [productiveIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <form onSubmit={handleSubmit((data) => setPending(cleanIndirectCostsForSubmit(data)))} className="space-y-6 pt-3">
        <CostCentersSection centers={centers} register={register} />
        
        <PrimaryAllocationSection
          concepts={concepts}
          register={register}
          setValue={setValue}
          watchedConcepts={watchedConcepts}
          watchedCenters={watchedCenters}
          allocationBases={allocationBases}
          companyId={companyId}
        />

        <SecondaryAllocationSection
          serviceCenters={serviceCenters}
          targetCenters={targetCenters}
          serviceDists={serviceDists}
          register={register}
          setValue={setValue}
          watchedServiceDists={watchedServiceDists}
          allocationBases={allocationBases}
          companyId={companyId}
        />

        <ProductiveSettingsSection
          productiveCenters={productiveCenters}
          prodSettings={prodSettings}
          register={register}
          watchedProdSettings={watchedProdSettings}
        />

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
          reset(cleanIndirectCostsForForm(pending));
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

export * from './components/indirect-costs/helpers';
