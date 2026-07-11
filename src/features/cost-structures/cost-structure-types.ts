/**
 * Tipos de configuración de estructura de costos.
 * Espejo del schema de Zod del backend (cost.schema.ts).
 */

export interface WilsonConfig {
  annualDemand: number;
  orderCost: number;
  holdingRate: number;
  unitCost: number;
}

export interface StockMovement {
  date: string;
  type: 'purchase' | 'consumption';
  detail: string;
  quantity: number;
  unitCost?: number;
}

export interface RawMaterialConfig {
  wilson: WilsonConfig;
  stockPolicy: {
    minConsumption: number;
    maxConsumption: number;
    minLeadTime: number;
    maxLeadTime: number;
    safetyStock: number;
  };
  initialStock: { quantity: number; unitCost: number };
  movements: StockMovement[];
}

export interface DirectLaborConfig {
  workingDays: {
    totalDaysPerYear: number;
    unpaidAbsence: {
      sundays: number;
      saturdays: number;
      unjustifiedAbsences: number;
      holidaysOnWeekend: number;
    };
    paidAbsence: {
      holidays: number;
      vacations: number;
      sickness: number;
      specialLeaves: number;
      workAccidents: number;
    };
  };
  itcs: {
    derivationBase: number;
    fixedArt: number;
    sacFraction?: number;
    uncertainRemunerative: Array<{ name: string; coefficient: number }>;
    uncertainNonRemunerative: Array<{ name: string; coefficient: number }>;
  };
  departments: Array<{ name: string; basicRemuneration: number; hoursWorked: number }>;
}

export interface IndirectCostConfig {
  centers: Array<{ id: string; name: string; type: 'productive' | 'service' }>;
  concepts: Array<{
    name: string;
    amount: { fixed: number; variable: number };
    distribution: Record<string, number>;
  }>;
  serviceDistributions: Array<{
    serviceCenterId: string;
    toProductive?: Record<string, number>;
    toProductiveFixed?: Record<string, number>;
    toProductiveVariable?: Record<string, number>;
  }>;
  productiveSettings: Array<{
    centerId: string;
    budget: { fixed: number; variable: number };
    normalCapacity: number;
    actualActivity: number;
    actualCip: number;
  }>;
  // Orden de cierre del prorrateo secundario escalonado (Parte 4.4). Se deriva
  // del orden de las filas de "distribución de servicios": el primero cierra
  // primero y un servicio puede repartir a otro que aún no cerró.
  closureOrder?: string[];
}
