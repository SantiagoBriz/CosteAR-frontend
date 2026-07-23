import { useState } from 'react';
import {
  usePendingProposals,
  useApproveProposalMutation,
  useRejectProposalMutation,
  useRunNightlyPipelineMutation,
  useUpdateProposalMutation,
  type VaultProposal,
  type UpdateProposalInput
} from '../admin-hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle2, XCircle, FileText, AlertTriangle, Zap, Pencil, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function VaultProposals() {
  const { data: proposals, isLoading, error } = usePendingProposals();
  const approve = useApproveProposalMutation();
  const reject = useRejectProposalMutation();
  const update = useUpdateProposalMutation();
  const runNightly = useRunNightlyPipelineMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UpdateProposalInput>({});

  const startEdit = (proposal: VaultProposal) => {
    setEditingId(proposal.id);
    setDraft({
      title: proposal.title,
      sourceFile: proposal.sourceFile,
      proposedText: proposal.proposedText,
      justification: proposal.justification
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = async (id: string) => {
    try {
      await update.mutateAsync({ id, data: draft });
      setEditingId(null);
      setDraft({});
    } catch (err) {
      toast.error('No se pudieron guardar los cambios.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg flex gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p>No se pudieron cargar las propuestas del Nightly Pipeline.</p>
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100 text-sm">
          <div>
            <strong className="block mb-1">Nightly Learning Pipeline</strong>
            Estas propuestas se generan automáticamente en base a las consultas fallidas (RAG Misses) del día.
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
            disabled={runNightly.isPending}
            onClick={() => runNightly.mutate()}
          >
            {runNightly.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Forzar Entrenamiento Manual
          </Button>
        </div>
        <div className="text-center p-12 bg-white rounded-lg border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800">No hay propuestas pendientes</h3>
          <p className="text-slate-500 mt-1">El pipeline nocturno no ha sugerido nuevas ediciones para la bóveda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100 text-sm">
        <div>
          <strong className="block mb-1">Nightly Learning Pipeline</strong>
          Estas propuestas fueron generadas automáticamente por el LLM. Al aprobarlas, se commitean a la Bóveda.
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
          disabled={runNightly.isPending}
          onClick={() => runNightly.mutate()}
        >
          {runNightly.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Entrenar Ahora
        </Button>
      </div>

      <div className="grid gap-6">
        {proposals.map(proposal => {
          const isEditing = editingId === proposal.id;

          return (
            <Card key={proposal.id} className="overflow-hidden border-slate-200">
              <div className="bg-slate-50 border-b border-slate-100 py-4 px-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        value={draft.title ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        className="text-lg text-slate-800 font-semibold w-full bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 ring-blue-500"
                      />
                    ) : (
                      <h3 className="text-lg text-slate-800 font-semibold">{proposal.title}</h3>
                    )}
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                      <FileText className="w-4 h-4 shrink-0" />
                      {isEditing ? (
                        <input
                          value={draft.sourceFile ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, sourceFile: e.target.value }))}
                          className="font-mono text-xs bg-white border border-slate-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 ring-blue-500"
                        />
                      ) : (
                        <span>Archivo destino: <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">{proposal.sourceFile}</code></span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 ml-4">
                    {new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(proposal.createdAt))}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {proposal.requiresVerification && !isEditing && (
                  <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <strong className="block">Requiere verificación humana.</strong>
                      Este texto lo redactó la IA sin una corrección real de un costista de base — no está garantizado que sea correcto. Verificá el contenido antes de aprobar, o editalo vos misma.
                    </div>
                  </div>
                )}
                <div>
                  <strong className="text-sm text-slate-600 block mb-1">Justificación (IA):</strong>
                  {isEditing ? (
                    <textarea
                      value={draft.justification ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, justification: e.target.value }))}
                      rows={2}
                      className="w-full text-sm text-slate-700 bg-white border border-slate-300 rounded p-3 focus:outline-none focus:ring-2 ring-blue-500 resize-y"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{proposal.justification}</p>
                  )}
                </div>

                <div>
                  <strong className="text-sm text-slate-600 block mb-1">Texto Propuesto (Markdown):</strong>
                  {isEditing ? (
                    <textarea
                      value={draft.proposedText ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, proposedText: e.target.value }))}
                      rows={8}
                      className="w-full text-sm bg-slate-900 text-slate-200 p-4 rounded-lg font-mono focus:outline-none focus:ring-2 ring-blue-500 resize-y"
                    />
                  ) : (
                    <pre className="text-sm bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                      {proposal.proposedText}
                    </pre>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={update.isPending}
                      onClick={cancelEdit}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={update.isPending}
                      onClick={() => saveEdit(proposal.id)}
                    >
                      {update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Guardar cambios
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => startEdit(proposal)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => reject.mutate(proposal.id)}
                    >
                      {reject.isPending && reject.variables === proposal.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Rechazar
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => approve.mutate(proposal.id)}
                    >
                      {approve.isPending && approve.variables === proposal.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Aprobar y Commitear
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
