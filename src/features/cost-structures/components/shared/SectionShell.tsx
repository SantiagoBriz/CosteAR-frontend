import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { CheckCircle2 } from 'lucide-react';
import { ConfigHistoryPanel } from '../../ConfigHistoryPanel';

export function SectionShell({
  title, description, configured, children, structureId, historySection,
}: {
  title: string;
  description: string;
  configured: boolean;
  children: React.ReactNode;
  structureId?: string;
  historySection?: string;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          configured ? (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-ok">
              <CheckCircle2 className="size-3.5" /> Guardado
            </span>
          ) : undefined
        }
      />
      <CardBody className="px-6 pb-6 pt-0">
        {children}
        {structureId && historySection && (
          <ConfigHistoryPanel structureId={structureId} section={historySection} />
        )}
      </CardBody>
    </Card>
  );
}
