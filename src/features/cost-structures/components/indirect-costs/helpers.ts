import { type IndirectCostConfig } from '../../cost-structure-types';

export function emptyIndirectCosts(): IndirectCostConfig {
  return {
    centers: [],
    concepts: [],
    serviceDistributions: [],
    productiveSettings: [],
  };
}

export function cleanIndirectCostsForForm(cfg?: IndirectCostConfig): any {
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

export function cleanIndirectCostsForSubmit(data: any): IndirectCostConfig {
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
        distribution: cleanRecord(c.distribution),
      };
      return mode === 'base' ? { ...common, baseCode: (c.baseCode ?? '').trim() } : common;
    }),
    serviceDistributions: (data.serviceDistributions ?? []).map((s: any) => {
      const mode = s.distributionMode === 'base' ? 'base' : 'manual';
      if (mode === 'base') {
        return {
          serviceCenterId: s.serviceCenterId,
          distributionMode: 'base',
          baseCode: (s.baseCode ?? '').trim(),
          toProductive: cleanRecord(s.toProductive),
          toProductiveFixed: {},
          toProductiveVariable: {},
        };
      }
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
    closureOrder: (data.serviceDistributions ?? [])
      .map((s: any) => s.serviceCenterId)
      .filter((x: string) => !!x),
  };
}

export function fmtBudget(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFinite(n) || n === 0) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
