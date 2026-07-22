import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { AdminUsers } from './components/AdminUsers';

export function AdminUsersPage() {
  return (
    <AppShell wide>
      <div className="w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
        <PageHeader 
          title="Gestión de Staff" 
          description="Administración de cuentas con permisos especiales en CosteAR."
        />
        <div className="mt-8">
          <AdminUsers />
        </div>
      </div>
    </AppShell>
  );
}
