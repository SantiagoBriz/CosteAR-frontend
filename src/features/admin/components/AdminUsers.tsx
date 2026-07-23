import { useState } from 'react';
import { useAdminUsers, useCreateAdminUserMutation } from '../admin-hooks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, UserPlus, Users as UsersIcon, CheckCircle2 } from 'lucide-react';

export function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const { mutateAsync: createUser, isPending } = useCreateAdminUserMutation();
  
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    try {
      setErrorMsg('');
      await createUser({ email, password, name, role });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
        setEmail('');
        setPassword('');
        setName('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al crear usuario');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-surface-alt p-5 rounded-xl border border-line shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <UsersIcon className="size-5 text-indigo-500" />
            Gestión de Staff y Accesos
          </h2>
          <p className="text-sm text-ink-soft mt-1">
            Administrá las cuentas con permisos especiales para ingresar a CosteAR.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="size-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card className="overflow-hidden border-line bg-surface">
        {isLoading ? (
          <div className="p-8 text-center text-ink-soft font-medium animate-pulse">Cargando personal...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-alt text-ink-soft font-bold uppercase tracking-wider text-[10px] border-b border-line">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Fecha Creación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-black/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-extrabold text-indigo-700 border border-indigo-200">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-ink group-hover:text-indigo-600 transition-colors">{user.name}</div>
                          <div className="text-ink-soft text-xs font-medium">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'}`}>
                        {user.role === 'ADMIN' ? <ShieldCheck className="size-3.5" /> : <UsersIcon className="size-3.5" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-soft font-medium text-xs">
                      {new Date(user.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
                {users?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-ink-soft font-medium">
                      No hay usuarios registrados en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal / Overlay for User Creation */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 bg-surface border-line shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <UserPlus className="size-5 text-indigo-500" />
                  Crear Nuevo Usuario
                </h3>
                <p className="text-xs text-ink-soft mt-1">Generá credenciales para el staff administrativo o costistas operativos.</p>
              </div>
              
              {errorMsg && <div className="text-red-600 text-xs font-bold bg-red-50 border border-red-200 p-3 rounded-lg">{errorMsg}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">Nombre Completo</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-line bg-surface-alt rounded-lg p-2.5 text-sm font-medium text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Ej. Juan Pérez" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">Correo Electrónico</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-line bg-surface-alt rounded-lg p-2.5 text-sm font-medium text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="juan@costear.com" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">Contraseña Temporal</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-line bg-surface-alt rounded-lg p-2.5 text-sm font-medium text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">Nivel de Acceso (Rol)</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full border-line bg-surface-alt rounded-lg p-2.5 text-sm font-bold text-ink focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="ADMIN">Administrador General (Acceso Total)</option>
                    <option value="COSTISTA">Costista (Operador del Sistema)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-ink-soft hover:text-ink">
                  Cancelar
                </Button>
                <Button type="submit" loading={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Confirmar Creación
                </Button>
              </div>

              {success && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 py-2 rounded-lg mt-2">
                  <CheckCircle2 className="size-4" /> Usuario creado con éxito
                </div>
              )}
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
