export interface AIAnalysis {
  documentType?: string;
  quality?: string;
  qualityNote?: string;
  costSection?: string;
  message?: string;
  extractedData?: Record<string, unknown>;
}

export function parseAIAnalysis(reviewNote: string | null): AIAnalysis | null {
  if (!reviewNote) return null;
  try {
    const parsed = JSON.parse(reviewNote);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.documentType || parsed.message)
    ) {
      return parsed as AIAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

export const SECTION_LABELS: Record<string, string> = {
  MATERIA_PRIMA: "Materia Prima",
  MANO_DE_OBRA: "Mano de Obra",
  COSTOS_INDIRECTOS: "Costos Indirectos",
  VENTAS: "Ventas",
  MULTIPLE: "Múltiples Secciones",
  DESCONOCIDO: "Sin clasificar",
};

export const DOC_TYPE_OPTIONS: Record<string, string> = {
  FACTURA_COMPRA: "Factura de compra",
  FACTURA_VENTA: "Factura de venta",
  REMITO: "Remito",
  LIQUIDACION_MOD: "Liquidación de sueldos",
  PLANILLA_HORAS: "Planilla de horas",
  NOTA_DEBITO: "Nota de débito",
  NOTA_CREDITO: "Nota de crédito",
  DESCONOCIDO: "Sin clasificar",
};

export function fmt(n?: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n);
}
