import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, ListFilter, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface PortalStructure {
  id: string;
  productName: string;
  period: string;
  status: string;
}

// ── Left Sidebar Structures List ─────────────────────────────────────────────

interface CompanyStructuresListProps {
  connectionId: string;
  activeStructureId: string | null;
  onSelectStructure: (id: string, name: string) => void;
  onClearStructure: () => void;
}

export function CompanyStructuresList({
  connectionId,
  activeStructureId,
  onSelectStructure,
  onClearStructure,
}: CompanyStructuresListProps) {
  const { data: structures = [], isLoading } = useQuery<PortalStructure[]>({
    queryKey: ['portal-structures', connectionId],
    queryFn: async () => {
      const res = await api.get<{ data: PortalStructure[] }>(
        `/empresa-portal/connections/${connectionId}/structures`,
      );
      return res.data.data;
    },
  });

  return (
    <div className="space-y-1">
      {isLoading && <p className="px-2 py-1 text-xs text-ink-soft">Cargando productos…</p>}
      {!isLoading && structures.length === 0 && (
        <p className="px-2 py-1 text-xs text-ink-soft">Sin productos cargados</p>
      )}
      {structures.length > 0 && (
        <button
          type="button"
          onClick={onClearStructure}
          className={cn(
            'flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors',
            activeStructureId === null
              ? 'bg-granate-tenue text-granate font-extrabold'
              : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
          )}
        >
          <ListFilter className="size-4 mr-2" /> Todos los productos
        </button>
      )}
      {structures.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelectStructure(s.id, s.productName)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors',
            activeStructureId === s.id
              ? 'bg-granate text-white font-bold shadow-sm shadow-granate/20'
              : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
          )}
          title={`${s.productName} · ${s.period}`}
        >
          <Package className="size-4 shrink-0 opacity-75" />
          <span className="truncate flex-1">{s.productName}</span>
          <span className={cn('shrink-0 text-[10px] ml-1', activeStructureId === s.id ? 'text-white/70' : 'text-ink-soft/60')}>{s.period}</span>
        </button>
      ))}
    </div>
  );
}

// ── Chat Composer Product Dropdown Selector ─────────────────────────────────

interface StructureSelectDropdownProps {
  connectionId: string;
  selectedStructureId: string | null;
  onSelect: (id: string, name: string) => void;
}

export function StructureSelectDropdown({
  connectionId,
  selectedStructureId,
  onSelect,
}: StructureSelectDropdownProps) {
  const { data: structures = [] } = useQuery<PortalStructure[]>({
    queryKey: ['portal-structures', connectionId],
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = structures.find(s => s.id === selectedStructureId);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-alt hover:text-ink hover:border-action/30 transition-all shadow-sm"
      >
        <Package className="size-3.5 text-action shrink-0" />
        <span className="truncate max-w-[120px]">
          {selected ? `${selected.productName} (${selected.period})` : 'Elegir producto...'}
        </span>
        <ChevronDown className={cn("size-3.5 opacity-60 transition-transform duration-250", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-40 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_10px_30px_rgba(74,21,27,0.08)] animate-rise">
          <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft/40 border-b border-line mb-1">
            Asignar a:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {structures.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id, s.productName);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                  s.id === selectedStructureId
                    ? "bg-granate-tenue text-granate font-semibold"
                    : "text-ink-soft hover:bg-surface-alt hover:text-ink"
                )}
              >
                <Package className="size-3.5 shrink-0 opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.productName}</p>
                  <p className="text-[10px] opacity-70">{s.period}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
