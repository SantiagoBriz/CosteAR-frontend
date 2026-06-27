/** Tipos de la API de CosteAR (espejo del backend). */

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  cuit: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { costStructures: number };
}

export interface CostStructure {
  id: string;
  companyId: string;
  productName: string;
  period: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  costingSystem?: 'ORDERS' | 'PROCESSES';
  rawMaterialConfig: unknown | null;
  directLaborConfig: unknown | null;
  indirectCostConfig: unknown | null;
  salesUnitPrice: string | null;
  salesQuantity: string | null;
  createdAt: string;
}

export interface CalculationResult {
  rawMaterialConsumed: number;
  directLaborTotal: number;
  indirectCostsApplied: number;
  productionCost: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginPct: number;
  detail: {
    rawMaterial: { optimalLot: number; finalStockQty: number; finalStockValue: number };
    directLabor: { workingDays: number; itcsPercent: number; hourlyRates: Record<string, number> };
    indirectCosts: {
      perDepartment: Record<
        string,
        {
          cipTotal: number;
          appliedCip: number;
          budgetVariance: number;
          volumeVariance: number;
          normalCapacity?: number;
          actualActivity?: number;
          quota?: number;
          actualCip?: number;
        }
      >;
    };
  };
}

export interface CostCalculation {
  id: string;
  costStructureId: string;
  rawMaterialConsumed: string;
  directLaborTotal: string;
  indirectCostsApplied: string;
  productionCost: string;
  costOfGoodsSold: string;
  grossMargin: string;
  grossMarginPct: string;
  detail: CalculationResult['detail'];
  calculatedAt: string;
}

export interface Alert {
  id: string;
  type: 'MARGIN_BELOW_THRESHOLD' | 'MACRO_CHANGE' | 'COST_SPIKE';
  message: string;
  threshold: string | null;
  actualValue: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AlertSetting {
  marginThresholdPct: string;
  emailNotifications: boolean;
}

export interface MacroSnapshot {
  id: string;
  source: 'BCRA' | 'INDEC' | 'ARCA' | 'PARITARIA';
  indicatorCode: string;
  value: string;
  effectiveDate: string;
}
