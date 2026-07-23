import { useAdminStats } from '../admin-hooks';
import { Card } from '@/components/ui/Card';
import { 
  Users, Activity, Database, TrendingUp, DollarSign, 
  Server, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminOverview() {
  const { data: stats } = useAdminStats();

  // Mocked MRR calculation based on total users for demo purposes
  const mrr = (stats?.saas.totalUsers || 0) * 49.99; 
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Sección 1: Business Metrics (SaaS) */}
      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-ink-soft mb-4 pl-1">
          Métricas de Negocio (SaaS)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* MRR Card */}
          <Card className="relative overflow-hidden p-6 border-line bg-surface hover:border-granate-tenue transition-colors group">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="size-5" />
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                +12.5% <TrendingUp className="size-3" />
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-ink-soft">Ingreso Recurrente (MRR)</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-ink">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mrr)}
                </span>
                <span className="text-xs font-bold text-ink-soft">/mes</span>
              </div>
            </div>
          </Card>

          {/* Users Card */}
          <Card className="relative overflow-hidden p-6 border-line bg-surface hover:border-granate-tenue transition-colors group">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Users className="size-5" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-ink-soft">Usuarios Registrados</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-ink">
                  {stats?.saas.totalUsers ?? '-'}
                </span>
                <span className="text-xs font-bold text-ink-soft">cuentas activas</span>
              </div>
            </div>
          </Card>

          {/* Activity Card */}
          <Card className="relative overflow-hidden p-6 border-line bg-surface hover:border-granate-tenue transition-colors group">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Activity className="size-5" />
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Hoy
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-ink-soft">Sesiones Activas</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-ink">
                  {stats?.saas.activeUsersToday ?? '-'}
                </span>
                <span className="text-xs font-bold text-ink-soft">usuarios hoy</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sección 2: System Health (RAG & Infra) */}
      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-ink-soft mb-4 pl-1 mt-6">
          Salud del Sistema (IA & Bóveda)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Vault Health */}
          <Card className="p-6 border-line bg-surface flex items-center gap-6">
            <div className="relative shrink-0 flex items-center justify-center size-16 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <Database className="size-7" />
              <div className="absolute -bottom-1 -right-1 size-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-line">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-soft">Volumen de la Bóveda</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-ink">{stats?.vault.totalChunks ?? '-'}</span>
                <span className="text-xs font-bold text-ink-soft mb-1">fragmentos indexados (chunks)</span>
              </div>
              <p className="text-[11px] font-medium text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Base de datos vectorial en línea y sincronizada
              </p>
            </div>
          </Card>

          {/* AI Pipeline Health */}
          <Card className="p-6 border-line bg-surface flex items-center gap-6">
            <div className="relative shrink-0 flex items-center justify-center size-16 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
              <Server className="size-7" />
              <div className={cn("absolute -bottom-1 -right-1 size-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-line", 
                (stats?.vault.pendingSignals || 0) > 0 ? "animate-bounce" : ""
              )}>
                {(stats?.vault.pendingSignals || 0) > 0 ? (
                  <ShieldAlert className="size-3.5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-soft">Pipeline de Autoaprendizaje</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-black text-ink">{stats?.vault.pendingSignals ?? '-'}</span>
                <span className="text-xs font-bold text-ink-soft mb-1">señales pendientes</span>
              </div>
              <p className="text-[11px] font-medium text-ink-soft mt-2">
                El proceso automático corre a las 02:00 AM
              </p>
            </div>
          </Card>
          {/* Learning Sources */}
          <Card className="p-6 border-line bg-surface col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-ink-soft mb-4">Señales por Fuente de Origen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface-alt border border-line">
                <p className="text-[11px] font-bold text-ink-soft uppercase">Pipeline Nocturno</p>
                <p className="text-2xl font-black text-ink mt-1">{stats?.vault.signalsBySource?.['PIPELINE_NOCTURNO'] ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-alt border border-line">
                <p className="text-[11px] font-bold text-ink-soft uppercase">Validaciones (Humano)</p>
                <p className="text-2xl font-black text-ink mt-1">{stats?.vault.signalsBySource?.['VALIDACIONES_CORRECCION'] ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-alt border border-line">
                <p className="text-[11px] font-bold text-ink-soft uppercase">Chat Costita</p>
                <p className="text-2xl font-black text-ink mt-1">{stats?.vault.signalsBySource?.['COSTISTA_CHAT'] ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
