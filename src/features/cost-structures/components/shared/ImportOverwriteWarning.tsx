import { AlertTriangle } from 'lucide-react';

export function ImportOverwriteWarning() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-[13px] text-warn">
      <AlertTriangle className="size-4 shrink-0" />
      <span>Esta sección ya tenía datos guardados. La importación reemplazó lo que ves abajo, pero no se guarda hasta que presiones "Guardar".</span>
    </div>
  );
}
