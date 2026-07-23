/** Tipos de la API de CosteAR (espejo del backend). */

/**
 * El RITMO de costeo de la empresa: cada cuánto cierra un período.
 * No toda empresa costea por mes; hay quienes cierran por quincena o por trimestre.
 */
export type Periodicity = 'MONTHLY' | 'BIWEEKLY' | 'QUARTERLY';

export const PERIODICITY_OPTIONS: { value: Periodicity; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensual — cierra todos los meses' },
  { value: 'BIWEEKLY', label: 'Quincenal — cierra cada 15 días' },
  { value: 'QUARTERLY', label: 'Trimestral — cierra cada 3 meses' },
];

export const PERIODICITY_LABEL: Record<Periodicity, string> = {
  MONTHLY: 'Mensual',
  BIWEEKLY: 'Quincenal',
  QUARTERLY: 'Trimestral',
};

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  cuit: string | null;
  isActive: boolean;
  createdAt: string;
  periodicity: Periodicity;
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
  /** Unidades VENDIDAS (facturación y margen). */
  salesQuantity: string | null;
  /** Unidades PRODUCIDAS (costo unitario). Si es null, se usan las vendidas. */
  productionQuantity: string | null;
  createdAt: string;
  deletedAt?: string | null;
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
    directLabor: {
      workingDays: number;
      paidDays?: number;
      itcsPercent: number;
      iapPercent: number;
      hourlyRates: Record<string, number>;
      itcsBreakdown?: { certain: number; uncertainRemunerative: number; derived: number; uncertainNonRemunerative: number };
      departments?: Array<{
        name: string;
        basicRemuneration: number;
        socialChargesCost: number;
        totalMod: number;
        hourlyRate: number;
        budgetedHours: number;
        realHours?: number;
      }>;
    };
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
          budgetFixed?: number;
          budgetVariable?: number;
          quotaFixed?: number;
          quotaVariable?: number;
          overUnderApplied?: number;
          /** E3 — faltan datos de cierre (actividad real y/o CIP real): las
           *  variaciones no se calculan y el CIF se aplica a capacidad normal. */
          pendingClosing?: boolean;
          appliedOn?: 'actualActivity' | 'normalCapacity';
        }
      >;
    };
    // Costo unitario de producción — el número final del sistema de costos.
    // Opcional: los cálculos guardados antes de esta versión no lo tienen.
    unitCost?: {
      unitsProduced: number;
      unitProductionCost: number;
      unitCostOfGoodsSold: number;
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
