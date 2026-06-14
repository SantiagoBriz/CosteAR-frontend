import { useState } from 'react';
import { Button } from '@/components/ui/Button';
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
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl">
        <h3 className="mb-4 font-bold text-ink">{isEdit ? 'Editar línea de costo' : 'Agregar costo manual'}</h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-soft">Sección</label>
            <select className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none" value={costSection} onChange={(e) => setCostSection(e.target.value)}>
              {SECTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-soft">Descripción</label>
            <input className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Alquiler del local" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-soft">Monto (ARS)</label>
              <input className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-soft">Período</label>
              <input className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-06" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-soft">Proveedor (opcional)</label>
            <input className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-granate focus:outline-none" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} loading={create.isPending || update.isPending}>{isEdit ? 'Guardar cambios' : 'Agregar'}</Button>
        </div>
      </div>
    </div>
  );
}
