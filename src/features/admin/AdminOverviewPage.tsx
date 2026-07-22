import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { AdminOverview } from './components/AdminOverview';

export function AdminOverviewPage() {
  return (
    <AppShell wide>
      <div className="w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
        <PageHeader 
          title="Command Center" 
          description="Centro de control para la administración de la plataforma, métricas SaaS y Bóveda de Conocimiento."
        />
        <div className="mt-8">
          <AdminOverview />
        </div>
      </div>
    </AppShell>
  );
}
