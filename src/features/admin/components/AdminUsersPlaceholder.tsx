import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, UserPlus, Mail } from 'lucide-react';

export function AdminUsersPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-slate-800">Administradores del Sistema</h2>
          <p className="text-sm text-slate-500">Gestión de usuarios con permisos absolutos en CosteAR.</p>
        </div>
        <Button className="bg-slate-800 hover:bg-slate-900 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Administrador
        </Button>
      </div>

      <div className="grid gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Giuliana Di Rocco</p>
                <div className="flex items-center text-sm text-slate-500 gap-1">
                  <Mail className="w-3 h-3" />
                  giulianadiroccodev@gmail.com
                </div>
              </div>
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full uppercase tracking-wide">
              Súper Admin
            </div>
          </div>
        </Card>
        
        {/* Futuros admins irán listados acá */}
      </div>
    </div>
  );
}
