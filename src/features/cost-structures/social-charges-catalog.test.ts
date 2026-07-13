import { describe, it, expect } from 'vitest';
import { classifySocialCharge, SOCIAL_CHARGES_CATALOG } from './social-charges-catalog';

/**
 * D-1 — el "conocimiento del sistema" clasifica las cargas sociales inciertas
 * en remunerativas / no remunerativas, según la clase 8 de la cátedra:
 * de las inciertas, SOLO las remunerativas generan cargas derivadas, y los
 * conceptos que las generan son el IAP/YAP, el PAP (asistencia perfecta) y el
 * PPP (productividad). Clasificar mal DESVÍA EL COSTO.
 */
describe('classifySocialCharge — catálogo de la cátedra (clase 8)', () => {
  it('los premios que generan derivadas son REMUNERATIVOS (PAP y PPP)', () => {
    expect(classifySocialCharge('PAP (Premio Asistencia Perfecta)')).toBe('remunerative');
    expect(classifySocialCharge('PPP (Premio por Productividad)')).toBe('remunerative');
    // Cómo los suele escribir el costista.
    expect(classifySocialCharge('Premio por asistencia perfecta')).toBe('remunerative');
    expect(classifySocialCharge('premio productividad')).toBe('remunerative');
  });

  it('uniformes y almuerzos son NO REMUNERATIVOS (no generan derivadas)', () => {
    // Es el error caro: si caen como remunerativos, inflan el índice.
    expect(classifySocialCharge('Uniformes')).toBe('nonRemunerative');
    expect(classifySocialCharge('Almuerzos')).toBe('nonRemunerative');
    expect(classifySocialCharge('Viandas')).toBe('nonRemunerative');
    expect(classifySocialCharge('Ropa de trabajo')).toBe('nonRemunerative');
    expect(classifySocialCharge('Reintegro de guardería')).toBe('nonRemunerative');
    expect(classifySocialCharge('Gastos de medicamentos')).toBe('nonRemunerative');
  });

  it('reconoce sin importar acentos, mayúsculas ni texto alrededor', () => {
    expect(classifySocialCharge('ANTIGUEDAD')).toBe('remunerative');
    expect(classifySocialCharge('Antigüedad')).toBe('remunerative');
    expect(classifySocialCharge('  vianda del comedor  ')).toBe('nonRemunerative');
    expect(classifySocialCharge('Adicional por antiguedad')).toBe('remunerative');
  });

  it('si NO reconoce el concepto devuelve null (lo decide el costista, sin molestarlo)', () => {
    expect(classifySocialCharge('Plus convenio XY-2026')).toBeNull();
    expect(classifySocialCharge('')).toBeNull();
    expect(classifySocialCharge('   ')).toBeNull();
  });

  it('el catálogo no tiene un concepto en las dos clasificaciones a la vez', () => {
    const seen = new Map<string, string>();
    for (const item of SOCIAL_CHARGES_CATALOG) {
      const prev = seen.get(item.name);
      expect(prev, `"${item.name}" está duplicado en el catálogo`).toBeUndefined();
      seen.set(item.name, item.kind);
      // Cada concepto del catálogo se auto-clasifica con su propia clasificación.
      expect(classifySocialCharge(item.name)).toBe(item.kind);
    }
  });
});
