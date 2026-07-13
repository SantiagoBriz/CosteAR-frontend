import { useState } from 'react';
import { CalendarDays, Lock, LockOpen, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  usePeriods,
  useOpenNextPeriod,
  useClosePeriod,
  useReopenPeriod,
  type CostPeriod,
} from '../period-hooks';

interface PeriodBarProps {
  structureId: string;
  /** El período histórico tipeado a mano. Solo se muestra si no hay períodos reales todavía. */
  legacyPeriod?: string;
  /** Período que se está mirando. `null` = todavía no hay ninguno. */
  selectedId: string | null;
  onSelect: (periodId: string) => void;
  /** Cálculo que queda congelado con el cierre, si hay uno a mano. */
  runIdToFreeze?: string | null;
}

/**
 * Barra de período (problema C — Fase 2).
 *
 * Reemplaza el campo "período" tipeado a mano por el período REAL: cuál se está
 * mirando, si está abierto o cerrado, y las tres operaciones (abrir el siguiente,
 * cerrar, reabrir). Un período cerrado es solo-lectura; reabrirlo exige motivo.
 */
export function PeriodBar({
  structureId,
  legacyPeriod,
  selectedId,
  onSelect,
  runIdToFreeze,
}: PeriodBarProps) {
  const { data: periods, isLoading } = usePeriods(structureId);
  const openNext = useOpenNextPeriod(structureId);
  const closePeriod = useClosePeriod(structureId);
  const reopenPeriod = useReopenPeriod(structureId);

  const [dialog, setDialog] = useState<'open' | 'close' | 'reopen' | null>(null);
  const [carryAmounts, setCarryAmounts] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selected = periods?.find((p) => p.id === selectedId) ?? null;
  const hasOpen = periods?.some((p) => p.status === 'OPEN') ?? false;

  const run = async (action: () => Promise<CostPeriod>) => {
    setError(null);
    try {
      const period = await action();
      onSelect(period.id);
      setDialog(null);
      setReason('');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  if (isLoading) {
    return <div className="h-7 w-56 animate-pulse rounded-full bg-surface-alt" />;
  }

  // Todavía no se abrió ningún período: mostramos el histórico tipeado y ofrecemos
  // arrancar el primero. Es el estado de toda estructura anterior a los períodos.
  const empty = !periods || periods.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <CalendarDays className="size-3.5 text-ink-soft" />

        {empty ? (
          <span className="inline-flex items-center rounded-full border border-granate/20 bg-granate-tenue px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-granate-deep">
            Período de costo: {legacyPeriod ?? '—'}
          </span>
        ) : (
          <select
            value={selectedId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            className="h-7 rounded-full border border-granate/20 bg-granate-tenue px-2.5 text-[11px] font-bold uppercase tracking-wide text-granate-deep outline-none focus:border-granate"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.status === 'CLOSED' ? ' (cerrado)' : ''}
              </option>
            ))}
          </select>
        )}

        {selected && <PeriodStatusPill status={selected.status} />}

        {/* Cerrar / reabrir el período que se está mirando. */}
        {selected?.status === 'OPEN' && (
          <button
            type="button"
            onClick={() => setDialog('close')}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft hover:border-granate hover:text-granate"
          >
            <Lock className="size-3" /> Cerrar
          </button>
        )}
        {selected?.status === 'CLOSED' && (
          <button
            type="button"
            onClick={() => setDialog('reopen')}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft hover:border-granate hover:text-granate"
          >
            <LockOpen className="size-3" /> Reabrir
          </button>
        )}

        {/* Un solo período abierto por vez: si ya hay uno, no se puede abrir otro. */}
        {!hasOpen && (
          <button
            type="button"
            onClick={() => setDialog('open')}
            className="inline-flex items-center gap-1 rounded-full border border-action/30 bg-action/5 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-action hover:bg-action/10"
          >
            <Plus className="size-3" /> {empty ? 'Abrir período' : 'Abrir período siguiente'}
          </button>
        )}
      </div>

      {selected?.status === 'CLOSED' && (
        <p className="text-[11px] text-ink-soft">
          Mes cerrado: los números están congelados y no se puede editar. Para corregir algo, reabrilo.
          {selected.reopenCount > 0 && ` · Reabierto ${selected.reopenCount} vez(ces).`}
        </p>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0 text-danger/60 hover:text-danger">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Abrir: la receta viene siempre; los importes son opcionales. */}
      <ConfirmDialog
        open={dialog === 'open'}
        title={empty ? 'Abrir el primer período' : 'Abrir el período siguiente'}
        confirmLabel="Abrir"
        loading={openNext.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => void run(() => openNext.mutateAsync(carryAmounts))}
        message={
          <div className="space-y-3">
            <p>
              Se copia la <strong>receta</strong> (centros, bases, departamentos, capacidad normal).
              Las compras, los consumos y el cierre del mes anterior <strong>no</strong> se copian:
              son datos del mes.
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={carryAmounts}
                onChange={(e) => setCarryAmounts(e.target.checked)}
                className="mt-0.5 size-4 accent-granate"
              />
              <span>
                Traer también los <strong>importes</strong> del período anterior (CIF y sueldos) para
                revisarlos y corregirlos.
              </span>
            </label>
          </div>
        }
      />

      {/* Cerrar: el backend exige actividad real y CIP real en todos los centros. */}
      <ConfirmDialog
        open={dialog === 'close'}
        title={`Cerrar ${selected?.label ?? 'el período'}`}
        confirmLabel="Cerrar período"
        loading={closePeriod.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          void run(() =>
            closePeriod.mutateAsync({ periodId: selected!.id, runId: runIdToFreeze ?? null }),
          )
        }
        message={
          <p>
            Los números quedan <strong>congelados</strong> y el mes pasa a solo lectura. Si a algún
            centro productivo le falta la <strong>actividad real</strong> o el <strong>CIP real</strong>,
            el sistema no va a dejar cerrar y te va a decir cuál falta.
          </p>
        }
      />

      {/* Reabrir: exige motivo (mínimo 10 caracteres) y queda registrado. */}
      {dialog === 'reopen' && selected && (
        <ReopenDialog
          label={selected.label}
          reason={reason}
          onReason={setReason}
          loading={reopenPeriod.isPending}
          onCancel={() => {
            setDialog(null);
            setReason('');
          }}
          onConfirm={() =>
            void run(() => reopenPeriod.mutateAsync({ periodId: selected.id, reason }))
          }
        />
      )}
    </div>
  );
}

function PeriodStatusPill({ status }: { status: CostPeriod['status'] }) {
  const open = status === 'OPEN';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide',
        open ? 'bg-ok/10 text-ok' : 'bg-ink-soft/10 text-ink-soft',
      )}
    >
      {open ? <LockOpen className="size-3" /> : <Lock className="size-3" />}
      {open ? 'Abierto' : 'Cerrado'}
    </span>
  );
}

/**
 * Reabrir pide un motivo escrito. No usamos ConfirmDialog porque necesita un
 * campo de texto y validar el largo mínimo que exige el backend.
 */
function ReopenDialog({
  label,
  reason,
  onReason,
  loading,
  onCancel,
  onConfirm,
}: {
  label: string;
  reason: string;
  onReason: (v: string) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const tooShort = reason.trim().length < 10;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <LockOpen className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-ink">Reabrir {label}</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-ink-soft hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4 space-y-2 text-[13px] leading-relaxed text-ink-soft">
          <p>
            Reabrir un mes cerrado es la excepción, no la regla. Queda registrado{' '}
            <strong>quién, cuándo y por qué</strong>.
          </p>
          <textarea
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Ej.: llegó tarde la factura de energía de junio"
            className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink outline-none focus:border-granate"
          />
          {tooShort && (
            <p className="text-[11px] text-ink-soft">
              Escribí el motivo (al menos 10 caracteres).
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} loading={loading} disabled={tooShort}>
            Reabrir
          </Button>
        </div>
      </div>
    </div>
  );
}
