/** Tipos de la API de Trazabilidad Total v1 (espejo de trazabilidad.routes.ts del backend). */

export type SourceArea = 'deposito' | 'contaduria' | 'planta' | 'comercial' | 'costista' | 'sistema';
export type CaptureMethod = 'manual' | 'portal_operador' | 'ia_sugerido' | 'excel_import' | 'calculado';
export type CostElement = 'MP' | 'MOD' | 'CIP' | 'VENTA';
export type DataStatus = 'borrador' | 'validado' | 'aplicado' | 'anulado';

export interface TreeNode {
  id: string;
  label: string;
  formula: string | null;
  value: number | null;
  unit: string | null;
  sourceDpVersionIds: string[];
  children: TreeNode[];
}

export interface CalculationTree {
  runId: string;
  runN: number;
  engineVersion: string;
  tree: TreeNode[];
}

export interface RunSummary {
  id: string;
  runN: number;
  engineVersion: string;
  executedBy: string;
  executedAt: string;
  grossMargin: number | null;
  grossMarginPct: number | null;
}

export interface TraceField {
  key: string;
  value: number | null;
  unit: string | null;
  by: { name: string; role: string; area: string };
  at: string;
  method: CaptureMethod;
  device: string | null;
}

export interface TraceVersion {
  n: number;
  current: boolean;
  display: string;
  reason: string | null;
  by: string;
  at: string;
}

export interface DataPointTrace {
  id: string;
  label: string;
  display: string;
  status: DataStatus;
  signedBy: { name: string; role: string; at: string } | null;
  fields: TraceField[];
  periods: { hecho: string | null; captacion: string; imputado: string | null };
  evidence: { kind: string; reference: string; fileUrl: string | null } | null;
  versions: TraceVersion[];
  impacts: string[];
}

export interface ImputacionOption {
  periodo: string;
  label: string;
  recommended?: boolean;
}
