import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImputacionModal } from './ImputacionModal';
import { proposeImputation } from './imputacion';
import { useImputar, useDataPointTrace } from './trazabilidad-hooks';
import type { ImputacionOption } from './trazabilidad-types';

/**
 * F05 — resolución de datos sin imputar.
 *
 * El backend (F04) marca un cálculo como incompleto cuando corrió con datos que
 * todavía no se asignaron a un período (doble período, manual §3), y bloquea el
 * CIERRE del mes hasta resolverlos. Este componente es el único lugar donde el
 * costista puede resolverlo sin salir de la app ni conocer ningún detalle
 * técnico: una advertencia imposible de ignorar que lista cada dato por su
 * NOMBRE (nunca su id — regla #6) y lo hace accionable.
 *
 * No reimplementa nada: reusa `ImputacionModal`, `proposeImputation` (que ya
 * encodea las dos opciones del manual §3) y `useImputar`.
 */

interface DatoPendiente {
  id: string;
  nombre: string;
}

export function IncompleteNotice({
  datos,
  motivos,
  periodoCosto,
  structureId,
  doneTitle,
  doneLabel,
  onDone,
  busy,
}: {
  /** Datos sin imputar: `nombre` para mostrar, `id` solo para abrir la ficha. */
  datos: DatoPendiente[];
  /** Motivos legibles que arma el backend (opcional; hay un texto por defecto). */
  motivos?: string[];
  /** Período de costo de la estructura ('YYYY-MM'): base de la regla de imputación. */
  periodoCosto?: string;
  structureId: string;
  /** Texto del estado "ya está" una vez resueltos todos. */
  doneTitle: string;
  /** Etiqueta del botón que se ofrece cuando no queda ninguno pendiente. */
  doneLabel: string;
  onDone: () => void;
  /** Deshabilita el botón final mientras el padre recalcula/cierra. */
  busy?: boolean;
}) {
  // Se resuelven de a uno; los ya resueltos en esta sesión se sacan del listado
  // al toque (optimista), sin esperar a que el padre vuelva a calcular.
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [activo, setActivo] = useState<DatoPendiente | null>(null);

  const pendientes = datos.filter((d) => !resolved.has(d.id));
  const allResolved = pendientes.length === 0;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-sm',
        allResolved ? 'border-ok/30 bg-ok/5' : 'border-danger/40 bg-danger/5',
      )}
      role="alert"
    >
      {allResolved ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />
            <div>
              <p className="text-[14px] font-bold text-ink">Datos imputados</p>
              <p className="mt-0.5 text-[13px] text-ink-soft">{doneTitle}</p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={onDone}
              disabled={busy}
              className="rounded-xl bg-granate px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-granate-deep disabled:opacity-50"
            >
              {busy ? 'Procesando…' : doneLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-danger">
                Este resultado está incompleto y no es confiable
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">
                {motivos && motivos.length > 0 ? (
                  motivos.map((m, i) => (
                    <span key={i} className="block">
                      {m}
                    </span>
                  ))
                ) : (
                  <>
                    Hay datos que todavía no se asignaron a un período. El costo puede estar
                    dejándolos afuera o mezclando datos de otro mes. Resolvé cada uno antes de dar
                    el resultado por bueno.
                  </>
                )}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Datos a resolver
            </p>
            <ul className="flex flex-col gap-1.5">
              {pendientes.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setActivo(d)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-danger/30 bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-danger hover:bg-danger/5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                      {d.nombre}
                    </span>
                    <span className="shrink-0 text-[12px] font-bold text-granate">Resolver →</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activo && (
        <DatoImputacionModal
          dato={activo}
          periodoCosto={periodoCosto}
          structureId={structureId}
          onResolved={() => {
            setResolved((prev) => new Set(prev).add(activo.id));
            setActivo(null);
          }}
          onCancel={() => setActivo(null)}
        />
      )}
    </div>
  );
}

/**
 * Modal de imputación para UN dato pendiente. Trae la fecha del hecho de la
 * ficha (para armar las dos opciones del manual §3), guarda la decisión con
 * `useImputar` e invalida lo que corresponde para que el estado se refresque.
 */
function DatoImputacionModal({
  dato,
  periodoCosto,
  structureId,
  onResolved,
  onCancel,
}: {
  dato: DatoPendiente;
  periodoCosto?: string;
  structureId: string;
  onResolved: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const imputar = useImputar(structureId);
  const { data: trace, isLoading } = useDataPointTrace(dato.id);

  const hecho = trace?.periods.hecho ?? null; // 'YYYY-MM-DD' o null
  const options = buildOptions(hecho, periodoCosto);

  const choose = async (periodo: string) => {
    await imputar.mutateAsync({ dataPointId: dato.id, periodo, sourceArea: 'costista' });
    // useImputar ya invalida ['structures', structureId] (incluye sus corridas).
    // Refrescamos además la ficha del dato y los períodos para que el cierre y
    // el detalle queden consistentes al toque.
    void qc.invalidateQueries({ queryKey: ['data-points', dato.id, 'trace'] });
    void qc.invalidateQueries({ queryKey: ['cost-structures', structureId, 'periods'] });
    onResolved();
  };

  return (
    <ImputacionModal
      open
      detail={dato.nombre}
      options={options}
      loading={isLoading || imputar.isPending}
      onChoose={(periodo) => void choose(periodo)}
      onCancel={onCancel}
    />
  );
}

/**
 * Arma las dos opciones del modal reusando `proposeImputation` (manual §3). Si
 * no se conoce la fecha del hecho (dato sin `fecha_hecho`), igual se ofrece
 * imputar al período de costo: nunca se deja al costista sin acción posible.
 */
function buildOptions(hecho: string | null, periodoCosto?: string): ImputacionOption[] {
  if (!periodoCosto) return [];
  if (!hecho) {
    return [{ periodo: periodoCosto, label: `Imputar a ${periodoCosto} (devengado)`, recommended: true }];
  }
  const proposal = proposeImputation(hecho, periodoCosto);
  if ('options' in proposal) return proposal.options;
  // La fecha del hecho cae en el mismo mes que el período de costo: una sola
  // opción, imputar sin ambigüedad.
  return [{ periodo: proposal.auto, label: `Imputar a ${proposal.auto} (devengado)`, recommended: true }];
}
