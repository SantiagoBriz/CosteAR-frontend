import type { ReactNode } from 'react';
import { useParams, useSearch, Link } from '@tanstack/react-router';
import { Printer, FileText, ExternalLink, ArrowLeft, GitBranch } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';
import {
  useDataPointTrace,
  useCalculationTree,
  useStructureRuns,
} from '@/features/cost-structures/trazabilidad-hooks';
import type { TreeNode, DataStatus } from '@/features/cost-structures/trazabilidad-types';

// ── Helpers compartidos ──────────────────────────────────────────────────────

const traceDateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Tucuman',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  timeZoneName: 'short',
});
function fmtExactAt(iso: string): string {
  try { return traceDateFormatter.format(new Date(iso)); } catch { return iso; }
}
function fmtNodeValue(node: TreeNode): string {
  if (node.value === null || node.value === undefined) return '—';
  if (node.unit === '$') return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(node.value);
  if (node.unit === '%') return `${node.value.toFixed(2)}%`;
  return `${node.value.toLocaleString('es-AR', { maximumFractionDigits: 4 })}${node.unit ? ` ${node.unit}` : ''}`;
}

const STATUS_LABEL: Record<DataStatus, string> = {
  borrador: 'Borrador', validado: 'Validado', aplicado: 'Aplicado', anulado: 'Anulado',
};
function StatusPill({ status }: { status: DataStatus }) {
  const cls: Record<DataStatus, string> = {
    borrador: 'bg-idle/10 text-idle border-idle/20',
    validado: 'bg-ok/10 text-ok border-ok/20',
    aplicado: 'bg-granate text-white border-granate',
    anulado: 'bg-danger/10 text-danger border-danger/20',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', cls[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Encabezado tipo comprobante, común a las dos páginas. */
function ComprobanteHeader({
  kind, title, subtitle, period,
}: { kind: string; title: string; subtitle?: string; period?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-granate/30 pb-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-granate">{kind} · CosteAR</p>
        <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-granate-deep">{title}</h1>
        {subtitle && <p className="text-[13px] text-ink-soft">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 print:hidden">
        {period && (
          <span className="inline-flex items-center rounded-full border border-granate/20 bg-granate-tenue px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-granate-deep">
            Período: {period}
          </span>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Imprimir
        </Button>
      </div>
    </div>
  );
}

// ── Página: FICHA DEL DATO ───────────────────────────────────────────────────
// Ruta interna /trazabilidad/dato/$id — se abre con target="_blank" (misma app,
// mismo login). Formato comprobante, imprimible.

export function TrazabilidadDatoPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const search = useSearch({ strict: false }) as { period?: string };
  const { data: trace, isLoading, error } = useDataPointTrace(id);

  return (
    <AppShell wide>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-[13px] text-granate hover:text-action print:hidden">
          <ArrowLeft className="size-3.5" /> Ir al inicio
        </Link>

        <Card>
          <CardBody className="space-y-4">
            {isLoading && <p className="py-10 text-center text-sm text-ink-soft">Cargando ficha del dato…</p>}
            {error && <p className="py-10 text-center text-sm text-danger">{apiErrorMessage(error)}</p>}

            {trace && (
              <>
                <ComprobanteHeader
                  kind="Ficha del dato"
                  title={trace.label}
                  subtitle={trace.display}
                  period={search.period}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={trace.status} />
                  {trace.signedBy ? (
                    <span className="text-[12px] text-ink-soft">
                      Firmado por <strong className="text-ink">{trace.signedBy.name}</strong> ({trace.signedBy.role}) · {fmtExactAt(trace.signedBy.at)}
                    </span>
                  ) : (
                    <span className="text-[12px] text-ink-soft">Sin firmar</span>
                  )}
                </div>

                {/* Quién cargó cada campo (Depósito/Contaduría/Planta) */}
                <Section title="Quién lo cargó (por campo)">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {trace.fields.map((f) => (
                      <div key={f.key} className="rounded-lg border border-line bg-surface p-3 text-[12px]">
                        <p className="mb-1 font-semibold uppercase tracking-wide text-ink-soft">{f.key}</p>
                        <p className="text-ink">{f.value != null ? (f.unit === '$' ? <Money value={f.value} /> : `${f.value} ${f.unit ?? ''}`) : '—'}</p>
                        <p className="mt-1 text-ink-soft">{f.by.name} · {f.by.role} · <strong className="text-ink">{f.by.area}</strong></p>
                        <p className="text-ink-soft">{fmtExactAt(f.at)}</p>
                        <p className="text-ink-soft">{f.method}{f.device ? ` · ${f.device}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Períodos: hecho / captación / imputado */}
                <Section title="Cuándo">
                  <div className="grid gap-2 text-[12.5px] sm:grid-cols-3">
                    <Field label="Fecha del hecho" value={trace.periods.hecho ?? '—'} />
                    <Field label="Captación (con zona)" value={fmtExactAt(trace.periods.captacion)} />
                    <Field label="Período imputado" value={trace.periods.imputado ?? 'pendiente'} />
                  </div>
                </Section>

                {/* Comprobante / evidencia */}
                <Section title="Comprobante">
                  {trace.evidence ? (
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink">
                      <FileText className="size-4 text-ink-soft" /> {trace.evidence.kind}: <strong>{trace.evidence.reference}</strong>
                      {trace.evidence.fileUrl && (
                        <a href={trace.evidence.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-granate hover:text-action">
                          <ExternalLink className="size-3.5" /> abrir
                        </a>
                      )}
                    </p>
                  ) : <p className="text-[12.5px] text-ink-soft">Sin comprobante adjunto.</p>}
                </Section>

                {/* Historial de versiones */}
                <Section title="Historial de versiones">
                  <ul className="space-y-1.5">
                    {trace.versions.map((v) => (
                      <li key={v.n} className={cn('text-[12.5px]', v.current ? 'text-ink' : 'text-ink-soft')}>
                        <span className={cn('font-mono', !v.current && 'line-through')}>v{v.n} — {v.display}</span>
                        {v.reason && <span className="ml-1.5">· {v.reason}</span>}
                        <span className="ml-1.5">· {v.by} · {fmtExactAt(v.at)}</span>
                        {v.current && <span className="ml-1.5 rounded bg-ok/10 px-1.5 text-[10px] font-bold uppercase text-ok">vigente</span>}
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* En qué impacta */}
                {trace.impacts.length > 0 && (
                  <Section title="En qué impacta">
                    <p className="text-[12.5px] text-ink">
                      {trace.impacts.map((imp, i) => (
                        <span key={imp}><strong>{imp}</strong>{i < trace.impacts.length - 1 ? ' → ' : ''}</span>
                      ))}
                    </p>
                  </Section>
                )}

                <p className="border-t border-line pt-2 font-mono text-[10px] text-ink-soft/60">id inmutable: {trace.id}</p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

// ── Página: VER CÁLCULO (árbol de derivación completo) ───────────────────────
// Ruta interna /trazabilidad/calculo/$runId?structureId=&period=

export function TrazabilidadCalculoPage() {
  const { runId } = useParams({ strict: false }) as { runId: string };
  const search = useSearch({ strict: false }) as { structureId?: string; period?: string };
  const { data, isLoading, error } = useCalculationTree(runId);
  const { data: runs } = useStructureRuns(search.structureId ?? '');

  return (
    <AppShell wide>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-[13px] text-granate hover:text-action print:hidden">
          <ArrowLeft className="size-3.5" /> Ir al inicio
        </Link>

        <Card>
          <CardBody className="space-y-4">
            {isLoading && <p className="py-10 text-center text-sm text-ink-soft">Cargando cálculo…</p>}
            {error && <p className="py-10 text-center text-sm text-danger">{apiErrorMessage(error)}</p>}

            {data && (
              <>
                <ComprobanteHeader
                  kind="Ver cálculo"
                  title={`Corrida #${data.runN}`}
                  subtitle={`Motor ${data.engineVersion} — cada número muestra su fórmula hasta el dato madre`}
                  period={search.period}
                />

                {/* Selector de corrida (eje temporal real: cada recálculo es un
                    snapshot). Abrí varias pestañas y compará lado a lado. */}
                {runs && runs.length > 1 && search.structureId && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt/50 px-3 py-2 text-[12.5px] print:hidden">
                    <GitBranch className="size-4 text-ink-soft" />
                    <span className="text-ink-soft">Ver otra corrida:</span>
                    {runs.map((r) => (
                      <Link
                        key={r.id}
                        to="/trazabilidad/calculo/$runId"
                        params={{ runId: r.id }}
                        search={{ structureId: search.structureId, period: search.period }}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 font-medium',
                          r.id === runId
                            ? 'border-granate bg-granate-tenue text-granate-deep'
                            : 'border-line text-ink-soft hover:bg-surface-alt',
                        )}
                      >
                        #{r.runN}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-line">
                  {data.tree.map((node) => (
                    <CalcRow key={node.id} node={node} depth={0} period={search.period} />
                  ))}
                </div>

                <p className="text-[11.5px] text-ink-soft print:hidden">
                  Los valores <span className="underline decoration-dotted">subrayados</span> enlazan a la ficha del dato madre (se abre en pestaña nueva).
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

/** Fila del árbol para la página completa (siempre expandida, imprimible). */
function CalcRow({ node, depth, period }: { node: TreeNode; depth: number; period?: string }) {
  const dataPointId = node.sourceDpVersionIds[0];
  return (
    <>
      <div
        className="flex items-center gap-2 border-b border-line px-4 py-2 last:border-b-0"
        style={{ paddingLeft: `${16 + depth * 22}px` }}
      >
        {dataPointId ? (
          <Link
            to="/trazabilidad/dato/$id"
            params={{ id: dataPointId }}
            search={{ period }}
            target="_blank"
            className="min-w-0 flex-1 truncate text-left text-[13px] text-ink underline decoration-dotted decoration-ink-soft/50 underline-offset-4 hover:text-granate"
            title="Abrir ficha del dato en pestaña nueva"
          >
            {node.label}
          </Link>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{node.label}</span>
        )}
        {node.formula && (
          <span className="hidden shrink-0 truncate font-mono text-[11px] text-ink-soft/70 sm:block sm:max-w-[300px]">{node.formula}</span>
        )}
        <span className="w-32 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">{fmtNodeValue(node)}</span>
      </div>
      {node.children.map((c) => <CalcRow key={c.id} node={c} depth={depth + 1} period={period} />)}
    </>
  );
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-granate-deep">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-ink">{value}</p>
    </div>
  );
}
