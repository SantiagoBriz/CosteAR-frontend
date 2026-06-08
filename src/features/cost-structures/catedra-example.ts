/**
 * Configuración de ejemplo de la Cátedra de Costos (UNT), idéntica a la del
 * Excel v3.0. Permite poblar una estructura con un click para ver el motor
 * funcionando de punta a punta con valores verificados.
 */
export const catedraExample = {
  rawMaterial: {
    wilson: { annualDemand: 24000, orderCost: 3500, holdingRate: 0.3, unitCost: 800 },
    stockPolicy: {
      minConsumption: 40,
      maxConsumption: 90,
      minLeadTime: 8,
      maxLeadTime: 12,
      safetyStock: 200,
    },
    initialStock: { quantity: 300, unitCost: 800 },
    movements: [
      { date: '2026-05-02', type: 'purchase', detail: 'Factura A-101', quantity: 500, unitCost: 850 },
      { date: '2026-05-08', type: 'consumption', detail: 'Orden Prod. 01', quantity: 400 },
      { date: '2026-05-15', type: 'purchase', detail: 'Factura A-118', quantity: 600, unitCost: 900 },
      { date: '2026-05-24', type: 'consumption', detail: 'Orden Prod. 02', quantity: 700 },
    ],
  },
  directLabor: {
    workingDays: { totalDaysPerYear: 365, nonWorkingDays: 115, vacationDays: 14, averageAbsenceDays: 6 },
    socialCharges: [
      { name: 'Jubilación', percent: 16 },
      { name: 'Obra social', percent: 6 },
      { name: 'ART', percent: 5 },
      { name: 'SAC s/cargas', percent: 9 },
      { name: 'Vacaciones', percent: 6 },
      { name: 'Otros', percent: 8 },
    ],
    departments: [
      { departmentName: 'Armado', workers: 5, monthlyWage: 400000, hoursPerDay: 8 },
      { departmentName: 'Pintura', workers: 3, monthlyWage: 350000, hoursPerDay: 8 },
    ],
  },
  indirectCosts: {
    centers: [
      { id: 'prod1', name: 'Armado', type: 'productive' },
      { id: 'prod2', name: 'Pintura', type: 'productive' },
      { id: 'serv1', name: 'Mantenimiento', type: 'service' },
    ],
    concepts: [
      { name: 'Alquiler', amount: { fixed: 300000, variable: 0 }, distribution: { prod1: 50, prod2: 30, serv1: 20 } },
      { name: 'Energía', amount: { fixed: 0, variable: 180000 }, distribution: { prod1: 40, prod2: 50, serv1: 10 } },
    ],
    serviceDistributions: [
      { serviceCenterId: 'serv1', toProductive: { prod1: 60, prod2: 40 } },
    ],
    productiveSettings: [
      { centerId: 'prod1', budget: { fixed: 200000, variable: 120000 }, normalCapacity: 9200, actualActivity: 9000, actualCip: 325000 },
      { centerId: 'prod2', budget: { fixed: 150000, variable: 90000 }, normalCapacity: 5520, actualActivity: 5400, actualCip: 245000 },
    ],
  },
} as const;
