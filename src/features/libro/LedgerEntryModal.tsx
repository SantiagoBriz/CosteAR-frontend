import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateLedgerEntry, useUpdateLedgerEntry, type LedgerEntry } from './libro-hooks';

const SECTIONS = [
  { v: 'MATERIA_PRIMA', l: 'Materia Prima' },
  { v: 'MANO_DE_OBRA', l: 'Mano de Obra' },
  { v: 'COSTOS_INDIRECTOS', l: 'Costos Indirectos' },
  { v: 'VENTAS', l: 'Ventas' },
];

function todayPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Modal para crear una línea manual o editar una existente del libro de costos.
 * Si `entry` viene, es edición; si no, alta manual (requiere companyId).
 */
export function LedgerEntryModal({
  entry,
  companyId,
  defaultPeriod,
  onClose,
}: {
  entry?: LedgerEntry;
  companyId?: string;
  defaultPeriod?: string;
  onClose: () => void;
}) {
  const isEdit = !!entry;
  const create = useCreateLedgerEntry();
  const update = useUpdateLedgerEntry();

  const [costSection, setCostSection] = useState(entry?.costSection ?? 'MATERIA_PRIMA');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [supplier, setSupplier] = useState(entry?.supplier ?? '');
  const [period, setPeriod] = useState(entry?.period ?? defaultPeriod ?? todayPeriod());
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const amt = Number(amount.replace(',', '.'));
    if (!description.trim()) return setError('Poné una descripción.');
    if (!Number.isFinite(amt) || amt <= 0) return setError('El monto tiene que ser un número mayor a 0.');
    if (!/^\d{4}-\d{2}$/.test(period)) return setError('El período tiene que ser AAAA-MM.');

    try {
      if (isEdit) {
        await update.mutateAsync({ id: entry!.id, costSection, description, amount: amt, supplier: supplier || undefined, period });
      } else {
        if (!companyId) return setError('Elegí una empresa primero (arriba).');
        await create.mutateAsync({ companyId, period, costSection, description, amount: amt, supplier: supplier || undefined });
      }
      onClose();
    } catch {
      setError('No se pudo guardar. Reintentá.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-7 shadow-[0_24px_60px_rgba(74,21,27,0.18)]">
        <h3 className="mb-5 text-[13px] font-extrabold uppercase tracking-wider text-granate-deep">
          {isEdit ? 'Editar línea de costo' : 'Agregar costo manual'}
        </h3>

        <div className="space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">Sección</label>
            <select
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors focus:border-granate focus:outline-none"
              value={costSection}
              onChange={(e) => setCostSection(e.target.value)}
            >
              {SECTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <Input
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Alquiler del local"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto (ARS)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              numeric
            />
            <Input
              label="Período"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-06"
            />
          </div>
          <Input
            label="Proveedor (opcional)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-[12.5px] font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} loading={create.isPending || update.isPending}>{isEdit ? 'Guardar cambios' : 'Agregar'}</Button>
        </div>
      </div>
    </div>
  );
}
