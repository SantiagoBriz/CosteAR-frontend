import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { RagChat } from './components/RagChat';

export function AdminRagPage() {
  return (
    <AppShell wide>
      <div className="w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
        <PageHeader 
          title="Consola IA" 
          description="Chat maestro para consultar la Bóveda de Conocimiento sin restricciones."
        />
        <div className="mt-8">
          <RagChat />
        </div>
      </div>
    </AppShell>
  );
}
