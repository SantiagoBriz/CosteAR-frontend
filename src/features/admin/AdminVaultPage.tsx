import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { VaultProposals } from './components/VaultProposals';

export function AdminVaultPage() {
  return (
    <AppShell wide>
      <div className="w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
        <PageHeader 
          title="Entrenamiento de Bóveda" 
          description="Aprobación de propuestas automáticas generadas por el pipeline de IA."
        />
        <div className="mt-8">
          <VaultProposals />
        </div>
      </div>
    </AppShell>
  );
}
