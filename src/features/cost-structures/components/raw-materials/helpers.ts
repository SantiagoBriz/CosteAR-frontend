import { fractionToPercentInput, percentInputToFraction } from '@/lib/utils';
import { type RawMaterialConfig } from '../../cost-structure-types';

export function emptyRawMaterial(): RawMaterialConfig {
  return {
    wilson: { annualDemand: 0, orderCost: 0, holdingRate: 0, unitCost: 0 },
    stockPolicy: { minConsumption: 0, maxConsumption: 0, minLeadTime: 0, maxLeadTime: 0, safetyStock: 0 },
    initialStock: { quantity: 0, unitCost: 0 },
    movements: [],
  };
}

export function cleanRawMaterialForForm(cfg?: RawMaterialConfig): any {
  const base = cfg ?? emptyRawMaterial();
  return {
    id: base.id,
    code: base.code ?? '',
    name: base.name ?? '',
    unit: base.unit ?? '',
    supplier: base.supplier ?? '',
    wilson: {
      annualDemand: base.wilson?.annualDemand === 0 ? '' : (base.wilson?.annualDemand ?? ''),
      orderCost: base.wilson?.orderCost === 0 ? '' : (base.wilson?.orderCost ?? ''),
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
      unitCost: m.type === 'consumption' ? null : (m.unitCost === 0 ? '' : (m.unitCost ?? '')),
    })),
  };
}

export function cleanRawMaterialForSubmit(data: any): RawMaterialConfig {
  const fallbackNum = (val: any) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
    return Number(val);
  };
  const str = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    id: data.id ?? crypto.randomUUID(),
    code: str(data.code),
    name: str(data.name),
    unit: str(data.unit),
    supplier: str(data.supplier),
    wilson: {
      annualDemand: fallbackNum(data.wilson?.annualDemand),
      orderCost: fallbackNum(data.wilson?.orderCost),
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
