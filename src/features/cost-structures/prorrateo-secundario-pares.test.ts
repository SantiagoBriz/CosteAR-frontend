import { describe, it, expect } from 'vitest';
import {
  cleanIndirectCostsForForm,
  cleanIndirectCostsForSubmit,
} from './IndirectCostsForm';
import type { IndirectCostConfig } from './cost-structure-types';

/**
 * F01-B — el frontend habla el contrato de PARES EXPLÍCITOS del backend (F01-A).
 *
 * Al GUARDAR, cada valor del reparto secundario viaja con su `centroDestinoId`
 * (nunca por posición). Al CARGAR, se lee por id. Estos tests bloquean el bug
 * del prorrateo secundario: la posición de la columna no puede decidir a qué
 * centro va el valor.
 */
describe('F01-B — reparto secundario: enviar y leer por pares explícitos', () => {
  const baseForm = {
    centers: [
      { id: 'mecanizado', name: 'Mecanizado', type: 'productive' },
      { id: 'terminado', name: 'Terminado', type: 'productive' },
      { id: 'mant', name: 'Mantenimiento', type: 'service' },
    ],
    concepts: [],
    productiveSettings: [],
  };

  it('SUBMIT: en modo manual manda distributions con centroDestinoId, fijo y variable', () => {
    const config = cleanIndirectCostsForSubmit({
      ...baseForm,
      serviceDistributions: [
        {
          serviceCenterId: 'mant',
          distributionMode: 'manual',
          toProductiveFixed: { mecanizado: 60, terminado: 40 },
          toProductiveVariable: { mecanizado: 60, terminado: 40 },
        },
      ],
    });
    expect(config.serviceDistributions[0]!.distributions).toEqual([
      { centroDestinoId: 'mecanizado', fijo: 60, variable: 60 },
      { centroDestinoId: 'terminado', fijo: 40, variable: 40 },
    ]);
    // No manda la forma vieja por Records.
    expect(config.serviceDistributions[0]).not.toHaveProperty('toProductive');
    expect(config.serviceDistributions[0]).not.toHaveProperty('toProductiveFixed');
  });

  it('SUBMIT: nunca manda el propio centro como destino (auto-reparto) ni pares vacíos', () => {
    const config = cleanIndirectCostsForSubmit({
      ...baseForm,
      serviceDistributions: [
        {
          serviceCenterId: 'mant',
          distributionMode: 'manual',
          // Ruido: el propio centro y un par en cero.
          toProductiveFixed: { mecanizado: 60, terminado: 40, mant: 99, otro: 0 },
          toProductiveVariable: { mecanizado: 60, terminado: 40, mant: 99, otro: 0 },
        },
      ],
    });
    const ids = config.serviceDistributions[0]!.distributions.map((p) => p.centroDestinoId);
    expect(ids).not.toContain('mant'); // auto-reparto descartado
    expect(ids).not.toContain('otro'); // par cero-cero descartado
    expect(ids).toEqual(['mecanizado', 'terminado']);
  });

  it('SUBMIT: el orden de las claves NO cambia a qué centro va cada valor (mapeo por id)', () => {
    const rowA = {
      serviceCenterId: 'mant',
      distributionMode: 'manual',
      toProductiveFixed: { mecanizado: 60, terminado: 40 },
      toProductiveVariable: { mecanizado: 70, terminado: 30 },
    };
    // Mismo reparto, claves en orden invertido.
    const rowB = {
      serviceCenterId: 'mant',
      distributionMode: 'manual',
      toProductiveFixed: { terminado: 40, mecanizado: 60 },
      toProductiveVariable: { terminado: 30, mecanizado: 70 },
    };
    const norm = (cfg: IndirectCostConfig) =>
      Object.fromEntries(
        cfg.serviceDistributions[0]!.distributions.map((p) => [p.centroDestinoId, p]),
      );
    const a = norm(cleanIndirectCostsForSubmit({ ...baseForm, serviceDistributions: [rowA] }));
    const b = norm(cleanIndirectCostsForSubmit({ ...baseForm, serviceDistributions: [rowB] }));
    // Mecanizado recibe 60/70 en ambos, Terminado 40/30 en ambos.
    expect(a).toEqual(b);
    expect(a.mecanizado).toEqual({ centroDestinoId: 'mecanizado', fijo: 60, variable: 70 });
    expect(a.terminado).toEqual({ centroDestinoId: 'terminado', fijo: 40, variable: 30 });
  });

  it('SUBMIT: en modo base manda las unidades como fijo=variable con su centroDestinoId', () => {
    const config = cleanIndirectCostsForSubmit({
      ...baseForm,
      serviceDistributions: [
        {
          serviceCenterId: 'mant',
          distributionMode: 'base',
          baseCode: 'horas_maquina',
          toProductive: { mecanizado: 300, terminado: 200 },
        },
      ],
    });
    expect(config.serviceDistributions[0]).toMatchObject({
      serviceCenterId: 'mant',
      distributionMode: 'base',
      baseCode: 'horas_maquina',
      distributions: [
        { centroDestinoId: 'mecanizado', fijo: 300, variable: 300 },
        { centroDestinoId: 'terminado', fijo: 200, variable: 200 },
      ],
    });
  });

  it('SUBMIT (F03): descarta el reparto a un servicio que YA cerró (escalonado), pero conserva el reparto hacia adelante', () => {
    const twoServices = {
      ...baseForm,
      centers: [
        { id: 'mecanizado', name: 'Mecanizado', type: 'productive' },
        { id: 'terminado', name: 'Terminado', type: 'productive' },
        { id: 'mant', name: 'Mantenimiento', type: 'service' },
        { id: 'admplanta', name: 'Adm. Planta', type: 'service' },
      ],
    };
    const config = cleanIndirectCostsForSubmit({
      ...twoServices,
      serviceDistributions: [
        {
          // Fila 1 (cierra primero): puede repartir a admplanta, que aún no cerró.
          serviceCenterId: 'mant',
          distributionMode: 'manual',
          toProductiveFixed: { mecanizado: 50, terminado: 40, admplanta: 10 },
          toProductiveVariable: { mecanizado: 50, terminado: 40, admplanta: 10 },
        },
        {
          // Fila 2: NO puede repartir a mant (ya cerró) — valor viejo que quedó
          // en una columna que ahora está bloqueada. Debe descartarse.
          serviceCenterId: 'admplanta',
          distributionMode: 'manual',
          toProductiveFixed: { mecanizado: 55, terminado: 45, mant: 99 },
          toProductiveVariable: { mecanizado: 55, terminado: 45, mant: 99 },
        },
      ],
    });
    // Fila 1 conserva el reparto hacia adelante (a admplanta, todavía abierto).
    const row1 = config.serviceDistributions[0]!.distributions.map((p) => p.centroDestinoId);
    expect(row1).toContain('admplanta');
    expect(row1).toEqual(['mecanizado', 'terminado', 'admplanta']);
    // Fila 2 descarta el destino a mant (servicio ya cerrado) y a sí misma.
    const row2 = config.serviceDistributions[1]!.distributions.map((p) => p.centroDestinoId);
    expect(row2).not.toContain('mant');
    expect(row2).not.toContain('admplanta');
    expect(row2).toEqual(['mecanizado', 'terminado']);
    // El orden de cierre viaja como contrato F01.
    expect(config.closureOrder).toEqual(['mant', 'admplanta']);
  });

  it('SUBMIT (F02): un destino que apunta a un centro ELIMINADO no llega al payload (sin referencia colgada)', () => {
    // El centro 'terminado' fue eliminado: ya no está en `centers`, pero el
    // Record del formulario todavía tiene su clave. No debe sobrevivir.
    const config = cleanIndirectCostsForSubmit({
      centers: [
        { id: 'mecanizado', name: 'Mecanizado', type: 'productive' },
        { id: 'mant', name: 'Mantenimiento', type: 'service' },
      ],
      concepts: [],
      productiveSettings: [],
      serviceDistributions: [
        {
          serviceCenterId: 'mant',
          distributionMode: 'manual',
          toProductiveFixed: { mecanizado: 60, terminado: 40 },
          toProductiveVariable: { mecanizado: 60, terminado: 40 },
        },
      ],
    });
    const ids = config.serviceDistributions[0]!.distributions.map((p) => p.centroDestinoId);
    expect(ids).not.toContain('terminado'); // centro eliminado → sin referencia colgada
    expect(ids).toEqual(['mecanizado']);
  });

  it('LOAD: lee distributions del backend a los Records por id que edita la UI', () => {
    const fromBackend: IndirectCostConfig = {
      centers: baseForm.centers as IndirectCostConfig['centers'],
      concepts: [],
      productiveSettings: [],
      serviceDistributions: [
        {
          serviceCenterId: 'mant',
          distributionMode: 'manual',
          distributions: [
            { centroDestinoId: 'mecanizado', fijo: 60, variable: 70 },
            { centroDestinoId: 'terminado', fijo: 40, variable: 30 },
          ],
        },
      ],
    };
    const form = cleanIndirectCostsForForm(fromBackend);
    const row = form.serviceDistributions[0];
    // Cada valor queda bajo la clave de su centro destino (no por posición).
    expect(row.toProductiveFixed).toEqual({ mecanizado: 60, terminado: 40 });
    expect(row.toProductiveVariable).toEqual({ mecanizado: 70, terminado: 30 });
  });

  it('ROUND-TRIP: cargar y volver a guardar preserva el reparto por id', () => {
    const fromBackend: IndirectCostConfig = {
      centers: baseForm.centers as IndirectCostConfig['centers'],
      concepts: [],
      productiveSettings: [],
      serviceDistributions: [
        {
          serviceCenterId: 'mant',
          distributionMode: 'manual',
          distributions: [
            { centroDestinoId: 'mecanizado', fijo: 55, variable: 45 },
            { centroDestinoId: 'terminado', fijo: 45, variable: 55 },
          ],
        },
      ],
    };
    const back = cleanIndirectCostsForSubmit(cleanIndirectCostsForForm(fromBackend));
    expect(back.serviceDistributions[0]!.distributions).toEqual(
      fromBackend.serviceDistributions[0]!.distributions,
    );
  });
});
