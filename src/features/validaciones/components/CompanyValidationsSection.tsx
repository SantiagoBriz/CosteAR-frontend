import { useState } from 'react';
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ValidationEntryRow } from './ValidationEntryRow';
import type { DataEntry } from '../validaciones-hooks';

interface Props {
  companyName: string;
  industry: string | null;
  entries: DataEntry[];
  onApprove: (e: DataEntry) => void;
  onReject: (e: DataEntry) => void;
  onCorrect: (e: DataEntry) => void;
  onZoom: (src: string) => void;
}

export function CompanyValidationsSection({
  companyName,
  industry,
  entries,
  onApprove,
  onReject,
  onCorrect,
  onZoom,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-zinc-50/50 transition-colors sm:px-6 sm:py-5"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate shadow-sm">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-ink">
              {companyName}
            </p>
            {industry && (
              <p className="truncate text-[11px] font-medium text-ink-soft">
                {industry}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-action/15 bg-action/10 px-2.5 py-1 text-[11px] font-bold text-action shadow-sm">
            {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
          </span>
          {collapsed ? (
            <ChevronDown className="size-4 text-ink-soft" />
          ) : (
            <ChevronUp className="size-4 text-ink-soft" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-line divide-y divide-line">
          {entries.map((entry) => (
            <ValidationEntryRow
              key={entry.id}
              entry={entry}
              onApprove={() => onApprove(entry)}
              onReject={() => onReject(entry)}
              onCorrect={() => onCorrect(entry)}
              onZoom={onZoom}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
