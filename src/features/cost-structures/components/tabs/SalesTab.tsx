import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calculator } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function SalesTab({
  defaultPrice, defaultQty, defaultProducedQty, onSave, saving, allReady, onCalculate, calculating,
}: {
  defaultPrice?: number;
  defaultQty?: number;
  defaultProducedQty?: number;
  onSave: (p: number, q: number, produced: number | null) => Promise<void>;
  saving: boolean;
  allReady: boolean;
  onCalculate: () => void;
  calculating: boolean;
}) {
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<{ unitPrice: any; quantity: any; producedQuantity: any }>({
    defaultValues: {
      unitPrice: defaultPrice === 0 ? '' : (defaultPrice ?? ''),
      quantity: defaultQty === 0 ? '' : (defaultQty ?? ''),
      producedQuantity: defaultProducedQty === 0 ? '' : (defaultProducedQty ?? ''),
    },
  });

  useEffect(() => {
    reset({
      unitPrice: defaultPrice === 0 ? '' : (defaultPrice ?? ''),
      quantity: defaultQty === 0 ? '' : (defaultQty ?? ''),
      producedQuantity: defaultProducedQty === 0 ? '' : (defaultProducedQty ?? ''),
    });
  }, [defaultPrice, defaultQty, defaultProducedQty, reset]);

  const [pending, setPending] = useState<{ p: number; q: number; prod: number | null } | null>(null);

  const onSubmit = (v: any) => {
    const fallbackNum = (val: any) => {
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) return 0;
      return Number(val);
    };
    const producedRaw = v.producedQuantity;
    const produced =
      producedRaw === '' || producedRaw === null || producedRaw === undefined || isNaN(Number(producedRaw))
        ? null
        : Number(producedRaw);

    setPending({ p: fallbackNum(v.unitPrice), q: fallbackNum(v.quantity), prod: produced });
  };

  return (
    <Card>
      <CardHeader
        title="Datos de venta"
        description="Precio, unidades vendidas (para el margen) y unidades producidas (para el costo unitario)"
      />
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4">
          <Input label="Precio de venta unitario $" type="number" step="0.01" numeric
            placeholder="Ej: 25000" info="Precio al que vendés una unidad del producto. En pesos."
            {...register('unitPrice', { required: true })} />
          <Input label="Unidades vendidas" type="number" step="1" numeric
            placeholder="Ej: 800"
            info="Lo que VENDISTE en el período. Con esto se calcula la facturación y el margen bruto."
            {...register('quantity', { required: true })} />
          <Input label="Unidades producidas (opcional)" type="number" step="1" numeric
            placeholder="Ej: 1000"
            info="Lo que FABRICASTE en el período. Con esto se saca el costo por unidad. Si producís y vendés lo mismo, dejalo vacío."
            {...register('producedQuantity')} />
          <p className="rounded-xl border border-line bg-surface-alt px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
            No son lo mismo: si fabricaste 1.000 y vendiste 800, el costo del mes se reparte entre las
            <strong className="text-ink"> 1.000 producidas</strong>, no entre las 800 vendidas. Dividir por lo
            vendido infla el costo unitario.
          </p>
          {isDirty && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-warn">
              <span className="size-1.5 rounded-full bg-warn" /> Tenés cambios sin guardar
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="submit" variant="secondary" loading={saving}>Guardar precio</Button>
            {allReady && (
              <Button type="button" onClick={onCalculate} loading={calculating}>
                <Calculator className="size-4" /> Calcular ahora
              </Button>
            )}
          </div>
        </form>
      </CardBody>

      <ConfirmDialog
        open={!!pending}
        title="Actualizar Venta"
        message="¿Querés actualizar los datos de Venta?"
        confirmLabel="Guardar"
        loading={saving}
        onConfirm={async () => {
          if (!pending) return;
          await onSave(pending.p, pending.q, pending.prod);
          reset({ unitPrice: pending.p, quantity: pending.q, producedQuantity: pending.prod ?? '' });
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
