import { useState } from 'react';
import { ChevronRight, ChevronDown, Activity, FileText } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/utils';
import { useCalculationTree } from '../cost-structure-hooks';
import { TraceCard } from './TraceCard';

function TreeNode({ node, onNodeClick }: { node: any; onNodeClick: (versionId: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="text-sm">
      <div 
        className={cn(
          "flex items-center gap-2 py-2 px-2 hover:bg-surface-alt/50 rounded-md transition-colors",
          hasChildren && "cursor-pointer"
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="w-5 flex justify-center text-ink-soft">
          {hasChildren ? (
            expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
          ) : (
            <Activity className="size-3 text-action/50 group-hover:text-action transition-colors" />
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-between group"
          onClick={(e) => {
            if (!hasChildren && node.sourceDpVersionIds?.[0]) {
              e.stopPropagation();
              onNodeClick(node.sourceDpVersionIds[0]);
            }
          }}
        >
          <div className="flex flex-col">
            <span className={cn("font-medium", !hasChildren && node.sourceDpVersionIds?.length ? "text-action hover:underline" : "text-ink")}>{node.label}</span>
            {node.formula && (
              <span className="text-[11px] text-ink-soft font-mono flex items-center gap-1">
                <FileText className="size-3" /> {node.formula}
              </span>
            )}
          </div>
          {node.valueNum != null && (
            <div className="font-semibold tabular-nums text-ink text-right">
              <Money value={node.valueNum} />
              {node.unit && <span className="text-[10px] text-ink-soft ml-1">{node.unit}</span>}
            </div>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="ml-5 pl-3 border-l-2 border-line/50 flex flex-col mt-1 space-y-1">
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DerivationTree({ structureId, runId }: { structureId: string; runId: string }) {
  const { data: tree, isLoading, error } = useCalculationTree(structureId, runId);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardBody className="py-12 flex justify-center text-ink-soft text-sm">
          Cargando árbol de derivación...
        </CardBody>
      </Card>
    );
  }

  if (error || !tree) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader 
          title="Árbol de Derivación" 
          description="Trazabilidad matemática completa del cálculo. Hacé clic en los nodos resaltados para ver su ficha de datos." 
        />
        <CardBody className="overflow-x-auto p-4 bg-surface">
          <div className="min-w-[400px] flex flex-col space-y-2">
            {tree.map((node: any) => (
              <TreeNode key={node.id} node={node} onNodeClick={setSelectedVersionId} />
            ))}
          </div>
        </CardBody>
      </Card>

      {selectedVersionId && (
        <TraceCard 
          versionId={selectedVersionId} 
          onClose={() => setSelectedVersionId(null)} 
        />
      )}
    </>
  );
}
