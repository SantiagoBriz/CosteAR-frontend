import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useCreateAllocationBase, type AllocationBase } from '../../allocation-base-hooks';

export function BaseSelect({ bases, value, companyId, onSelect }: {
  bases: AllocationBase[] | undefined;
  value: string;
  companyId?: string;
  onSelect: (code: string) => void;
}) {
  const list = bases ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const create = useCreateAllocationBase();

  const inCatalog = list.some((b) => b.code === value);

  const slug = (s: string) =>
    s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

  const handleCreate = async () => {
    if (!companyId) { setErr('No se pudo identificar la empresa.'); return; }
    const name = newName.trim();
    const unit = newUnit.trim();
    if (!name || !unit) { setErr('Poné un nombre y una unidad.'); return; }
    const code = slug(name);
    if (!code) { setErr('El nombre no es válido.'); return; }
    try {
      const base = await create.mutateAsync({ companyId, code, name, unit });
      onSelect(base.code);
      setShowCreate(false); setNewName(''); setNewUnit(''); setErr(null);
    } catch {
      setErr('No se pudo crear la base. Puede que ya exista una con ese nombre.');
    }
  };

  return (
    <div className="space-y-1.5">
      <select
        value={value || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__new__') { setShowCreate(true); return; }
          onSelect(v);
        }}
        className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none sm:w-56"
      >
        <option value="">Elegir base…</option>
        {list.map((b) => (
          <option key={b.id} value={b.code}>
            {b.name}{b.unit ? ` (${b.unit})` : ''}{b.isSystem ? '' : ' · propia'}
          </option>
        ))}
        {value && !inCatalog && <option value={value}>{value} (fuera del catálogo)</option>}
        <option value="__new__">+ Crear base nueva…</option>
      </select>

      {showCreate && (
        <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2">
          <div className="flex flex-wrap gap-1.5">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre (ej. Superficie)" className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" />
            <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unidad (ej. m²)" className="w-28 rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-granate focus:outline-none" />
          </div>
          {err && <p className="text-[11px] text-danger">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowCreate(false); setErr(null); }}>Cancelar</Button>
            <Button type="button" size="sm" loading={create.isPending} onClick={handleCreate}>Crear base</Button>
          </div>
        </div>
      )}
    </div>
  );
}
