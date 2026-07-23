import { describe, it, expect } from 'vitest';
import { newTrazableMovements, proposeImputation } from './imputacion';
import type { StockMovement } from './cost-structure-types';

/**
 * Regresión F04 — el eslabón "crear → NULL" que las viejas pruebas no cubrían.
 *
 * El bug real no estaba en el motor (que ya marcaba incompleto cuando había un
 * dato con `periodoImputado = null`), sino en que ese dato NUNCA se creaba: al
 * guardar Materia Prima, la lista de movimientos nuevos se calculaba DESPUÉS de
 * que el guardado subiera el contador base, así que daba vacío y no se
 * registraba nada. Estas pruebas fijan el contrato de las dos piezas puras que
 * ahora deciden qué se registra y con qué imputación queda.
 */

const mov = (over: Partial<StockMovement>): StockMovement => ({
  date: '2026-07-10',
  type: 'purchase',
  detail: '',
  quantity: 1,
  unitCost: 1,
  ...over,
});

describe('newTrazableMovements — selección de movimientos nuevos de la sesión', () => {
  it('toma SOLO los agregados por encima del base y con fecha', () => {
    const yaEnServer = mov({ detail: 'vieja', date: '2026-07-01' });
    const nueva = mov({ detail: 'nueva', date: '2026-05-15' });
    // baseCount = 1 → la primera ya estaba guardada; la segunda es nueva.
    expect(newTrazableMovements([yaEnServer, nueva], 1)).toEqual([nueva]);
  });

  it('captura la primera compra de una MP recién creada (baseCount 0)', () => {
    // El bug hacía que ni la primera compra se registrara: acá baseCount es 0
    // y la única compra DEBE seleccionarse.
    const primera = mov({ detail: 'A-500', date: '2026-05-15' });
    expect(newTrazableMovements([primera], 0)).toEqual([primera]);
  });

  it('descarta movimientos sin fecha (no hay hecho económico que trazar)', () => {
    const sinFecha = mov({ detail: 'incompleta', date: '' });
    expect(newTrazableMovements([sinFecha], 0)).toEqual([]);
  });

  it('con base igual al total, no hay nada nuevo que registrar', () => {
    const a = mov({ date: '2026-07-01' });
    const b = mov({ date: '2026-07-02' });
    expect(newTrazableMovements([a, b], 2)).toEqual([]);
  });
});

describe('proposeImputation — un movimiento fuera de período queda pendiente (NULL)', () => {
  const periodo = '2026-07';

  it('fecha en OTRO mes → needsDecision (el dato se crea y queda sin imputar)', () => {
    const p = proposeImputation('2026-05-15', periodo);
    expect('needsDecision' in p && p.needsDecision).toBe(true);
    if ('options' in p) {
      // La recomendada es devengar al período de costo; la otra, mover al mes real.
      expect(p.options.map((o) => o.periodo)).toEqual([periodo, '2026-05']);
      expect(p.options[0]?.recommended).toBe(true);
    }
  });

  it('fecha en el MISMO mes → auto (se imputa sola, nunca queda pendiente)', () => {
    const p = proposeImputation('2026-07-20', periodo);
    expect('auto' in p && p.auto).toBe(periodo);
  });
});
