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
    workingDays: {
      totalDaysPerYear: 365,
      unpaidAbsence: { sundays: 52, saturdays: 52, unjustifiedAbsences: 3, holidaysOnWeekend: 4 },
      paidAbsence: { holidays: 19, vacations: 14, sickness: 5, specialLeaves: 2, workAccidents: 1 },
    },
    itcs: {
      derivationBase: 0.27,
      fixedArt: 0.015,
      uncertainRemunerative: [
        { name: 'Premio por Productividad', coefficient: 0.03 },
        { name: 'Antigüedad', coefficient: 0.04 },
        { name: 'Premio por Asistencia Perfecta', coefficient: 0.02 },
      ],
      uncertainNonRemunerative: [
        { name: 'Ropa de trabajo', coefficient: 0.01 },
        { name: 'Viandas / comedor', coefficient: 0.015 },
        { name: 'Medicamentos', coefficient: 0.005 },
      ],
    },
    departments: [
      { name: 'Departamento Productivo 1', basicRemuneration: 4500000, hoursWorked: 12000 },
      { name: 'Departamento Productivo 2', basicRemuneration: 3200000, hoursWorked: 9000 },
      { name: 'Departamento Productivo 3', basicRemuneration: 2800000, hoursWorked: 8000 },
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
