import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';

interface Props {
  isOpen: boolean;
  mismatchedDates: string[];
  currentPeriod: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImputationModal({ isOpen, mismatchedDates, currentPeriod, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertCircle className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-ink">Desfasaje de Período Detectado</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-ink-soft hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-5 text-[13px] leading-relaxed text-ink-soft space-y-3">
          <p className="font-semibold text-ink">
            Has ingresado comprobantes con fechas fuera del período actual ({currentPeriod}).
          </p>
          <p>
            La fecha del comprobante (hecho) es independiente del período contable al que afecta. 
            ¿Deseas imputar estos movimientos al período que estás costeando actualmente?
          </p>
          
          <div className="bg-surface-alt p-3 rounded border border-line text-xs font-mono text-ink-soft">
            Fechas detectadas: {mismatchedDates.join(', ')}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Revisar fechas
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Imputar a {currentPeriod}
          </Button>
        </div>
      </div>
    </div>
  );
}
