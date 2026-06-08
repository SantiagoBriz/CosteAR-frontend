import { useQuery } from '@tanstack/react-query';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { MacroSnapshot } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const SOURCE_LABEL: Record<string, string> = {
  BCRA: 'BCRA',
  INDEC: 'INDEC',
  ARCA: 'ARCA',
  PARITARIA: 'Paritaria',
};

export function MacroPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['macro', 'latest'],
    queryFn: async () => {
      const res = await api.get<{ data: MacroSnapshot[] }>('/macro/latest');
      return res.data.data;
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="Variables macro"
        description="Tipo de cambio, inflación e índices que impactan tus costos"
      />

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : !data?.length ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-ink-soft">
            Todavía no hay datos macro sincronizados. El worker los traerá de BCRA e INDEC.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((m) => (
            <Card key={m.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
                    {SOURCE_LABEL[m.source] ?? m.source}
                  </span>
                  <span className="text-[12px] text-ink-soft">{formatDate(m.effectiveDate)}</span>
                </div>
                <div className="mt-2 text-sm text-ink">{m.indicatorCode}</div>
                <div className="mt-1 tabular text-2xl font-bold text-granate">
                  {Number(m.value).toLocaleString('es-AR')}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
