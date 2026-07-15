import { useState } from 'react';
import { History, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useConfigHistory, type ConfigVersion } from './cost-structure-hooks';

const dateFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Tucuman',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  timeZoneName: 'short',
});
const at = (iso: string) => { try { return dateFmt.format(new Date(iso)); } catch { return iso; } };

/** Resumen legible de una versión de config, según la sección. */
function summarize(section: string, value: unknown): string {
  const v = (value ?? {}) as Record<string, any>;
  switch (section) {
    case 'rawMaterial': {
      const n = Array.isArray(v.materials) ? v.materials.length : (v.wilson ? 1 : 0);
      return `${n} materia${n === 1 ? '' : 's'} prima${n === 1 ? '' : 's'}`;
    }
    case 'directLabor': {
      const n = Array.isArray(v.departments) ? v.departments.length : 0;
      return `${n} departamento${n === 1 ? '' : 's'}`;
    }
    case 'indirectCosts': {
      const c = Array.isArray(v.centers) ? v.centers.length : 0;
      const k = Array.isArray(v.concepts) ? v.concepts.length : 0;
      return `${c} centro${c === 1 ? '' : 's'} · ${k} concepto${k === 1 ? '' : 's'}`;
    }
    case 'sales':
      return `precio $${v.salesUnitPrice ?? '—'} × ${v.salesQuantity ?? '—'} u`;
    default:
      return '';
  }
}

/**
 * Historial append-only de una sección de config (R1). Cada guardado quedó
 * registrado como una versión inmutable — ninguna se pisa ni se borra.
 */
export function ConfigHistoryPanel({ structureId, section }: { structureId: string; section: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useConfigHistory(structureId, open ? section : '');
  const [expanded, setExpanded] = useState<string | null>(null);
  const count = data?.length ?? 0;

  return (
    <div className="mt-4 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft hover:text-granate"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <History className="size-3.5" />
        Historial de cambios{open && count > 0 ? ` (${count} versión${count === 1 ? '' : 'es'})` : ''}
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-line px-1.5 text-[9px] uppercase tracking-wide text-ink-soft">
          <Lock className="size-2.5" /> append-only
        </span>
      </button>

      {open && (
        <div className="mt-2">
          {isLoading && <p className="text-[12px] text-ink-soft">Cargando historial…</p>}
          {!isLoading && count === 0 && (
            <p className="text-[12px] text-ink-soft">Sin cambios registrados todavía. Cada guardado va a quedar acá, inmutable.</p>
          )}
          {count > 0 && (
            <ul className="space-y-1.5">
              {data!.map((ver: ConfigVersion, i) => {
                const isCurrent = i === 0; // el endpoint devuelve la más nueva primero
                const isOpen = expanded === ver.id;
                return (
                  <li key={ver.id} className="rounded-lg border border-line bg-surface">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : ver.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px]"
                    >
                      {isOpen ? <ChevronDown className="size-3.5 text-ink-soft" /> : <ChevronRight className="size-3.5 text-ink-soft" />}
                      <span className="font-mono font-semibold text-ink">v{ver.versionN}</span>
                      {isCurrent && <span className="rounded bg-ok/10 px-1.5 text-[9px] font-bold uppercase text-ok">vigente</span>}
                      <span className="text-ink">{summarize(ver.section, ver.value)}</span>
                      <span className="ml-auto text-[11px] text-ink-soft">{at(ver.createdAt)}</span>
                    </button>
                    {isOpen && (
                      <pre className="max-h-64 overflow-auto border-t border-line bg-surface-alt/40 px-3 py-2 text-[10.5px] leading-relaxed text-ink-soft">
                        {JSON.stringify(ver.value, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
