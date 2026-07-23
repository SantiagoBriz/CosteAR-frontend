import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { isUnimputedError, unimputedDatosFromError, apiErrorMessage } from '@/lib/api';

/**
 * Contrato F04/F05: el frontend reconoce el 422 accionable del cierre (datos sin
 * imputar) por `code: MISSING_INPUT` + `details.field: periodoImputado`, sin
 * parsear el texto, y siempre muestra el mensaje en español del backend.
 */
function axiosErrorWith(data: unknown): AxiosError {
  const err = new AxiosError('Request failed', 'ERR_BAD_RESPONSE');
  // @ts-expect-error — armamos solo lo que leen los helpers.
  err.response = { status: 422, data };
  return err;
}

const closeMsg =
  'No se puede cerrar "Julio 2026": hay 1 dato(s) sin decisión de imputación de período.';

describe('detección del 422 de datos sin imputar (F04/F05)', () => {
  it('reconoce el error de período por code + field', () => {
    const e = axiosErrorWith({
      error: { code: 'MISSING_INPUT', message: closeMsg, details: { field: 'periodoImputado' } },
    });
    expect(isUnimputedError(e)).toBe(true);
    // El texto en español del backend se muestra tal cual (regla #5).
    expect(apiErrorMessage(e)).toBe(closeMsg);
  });

  it('no confunde otros MISSING_INPUT (otro field) ni otros códigos', () => {
    expect(
      isUnimputedError(
        axiosErrorWith({ error: { code: 'MISSING_INPUT', message: 'x', details: { field: 'rawMaterial' } } }),
      ),
    ).toBe(false);
    expect(
      isUnimputedError(axiosErrorWith({ error: { code: 'VALIDATION_ERROR', message: 'x' } })),
    ).toBe(false);
    expect(isUnimputedError(new Error('boom'))).toBe(false);
  });

  it('extrae datosPendientes si el error los adjunta, y null si no', () => {
    const conLista = axiosErrorWith({
      error: {
        code: 'MISSING_INPUT',
        message: closeMsg,
        details: { field: 'periodoImputado', datosPendientes: [{ id: 'dp1', nombre: 'Compra — Chapa' }] },
      },
    });
    expect(unimputedDatosFromError(conLista)).toEqual([{ id: 'dp1', nombre: 'Compra — Chapa' }]);

    const sinLista = axiosErrorWith({
      error: { code: 'MISSING_INPUT', message: closeMsg, details: { field: 'periodoImputado' } },
    });
    expect(unimputedDatosFromError(sinLista)).toBeNull();
  });
});
