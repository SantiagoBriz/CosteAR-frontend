import { useState } from 'react';
import { Users, Copy, Trash2, KeyRound, Eye, EyeOff, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';
import { useOperators, useGenerateOperatorAccess, useRevokeOperator, useResetOperatorPassword, type GeneratedAccess } from '@/features/empresa-portal/empresa-portal-hooks';

interface OperatorsSectionProps {
  companyId: string;
}

export function OperatorsSection({ companyId }: OperatorsSectionProps) {
  const { data: operators = [] } = useOperators(companyId);
  const generate = useGenerateOperatorAccess(companyId);
  const revoke = useRevokeOperator();
  const reset = useResetOperatorPassword();
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [operatorFullName, setOperatorFullName] = useState('');
  const [operatorRole, setOperatorRole] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(operatorEmail);

  const handleGenerate = async () => {
    if (!operatorFullName.trim() || !emailValid) return;
    setGenerateError(null);
    const displayName = operatorRole.trim()
      ? `${operatorFullName.trim()} — ${operatorRole.trim()}`
      : operatorFullName.trim();
    try {
      const result = await generate.mutateAsync({ operatorName: displayName, operatorEmail: operatorEmail.trim() });
      setGeneratedAccess(result);
      setOperatorFullName('');
      setOperatorRole('');
      setOperatorEmail('');
      setShowForm(false);
    } catch (e) {
      setGenerateError(apiErrorMessage(e));
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = async (operatorId: string) => {
    try {
      const result = await reset.mutateAsync(operatorId);
      setResetResult(result);
      setGeneratedAccess(null);
    } catch {
      // error silently
    }
  };

  return (
    <Card>
      <CardHeader
        title="Personal Autorizado"
        description="Gestioná los accesos de los operarios de planta para la carga de comprobantes."
        action={
          !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="size-4" /> Generar Acceso
            </Button>
          )
        }
      />
      <CardBody>
        {/* Formulario de invitación / registro */}
        {showForm && (
          <div className="mb-5 rounded-2xl border border-line bg-surface-alt p-5 animate-rise space-y-4">
            <h4 className="text-sm font-bold text-ink">Nuevo acceso para operario</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Nombre y Apellido"
                placeholder="Ej: Juan Pérez"
                value={operatorFullName}
                onChange={(e) => setOperatorFullName(e.target.value)}
              />
              <Input
                label="Puesto / Rol (opcional)"
                placeholder="Ej: Encargado de Taller"
                value={operatorRole}
                onChange={(e) => setOperatorRole(e.target.value)}
              />
              <Input
                label="Email del Operario"
                placeholder="juan@empresa.com"
                type="email"
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
              />
            </div>
            {generateError && (
              <p className="text-xs font-semibold text-danger">{generateError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleGenerate}
                loading={generate.isPending}
                disabled={!operatorFullName.trim() || !emailValid}
              >
                Generar Código
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setGenerateError(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Credenciales generadas */}
        {generatedAccess && (
          <div className="mb-5 rounded-2xl border border-granate/30 bg-granate-tenue/60 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso creado con éxito. Compartí estas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CredField
                label="Email / Usuario"
                value={generatedAccess.email}
                copied={copied === 'email'}
                onCopy={() => copyText(generatedAccess.email, 'email')}
              />
              {generatedAccess.tempPassword ? (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                    Contraseña temporal
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                    <span className="flex-1 font-mono text-sm text-ink">
                      {showPassword ? generatedAccess.tempPassword : '••••••••••••'}
                    </span>
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(generatedAccess.tempPassword || '', 'pass')}
                      className={cn('text-ink-soft hover:text-ink', copied === 'pass' && 'text-green-600')}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                    Código de Invitación / Vinculación
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                    <span className="flex-1 font-mono text-sm font-bold tracking-wider text-granate">
                      {generatedAccess.inviteCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(generatedAccess.inviteCode!, 'invite')}
                      className={cn('text-ink-soft hover:text-ink', copied === 'invite' && 'text-green-600')}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">El operador ya tiene cuenta — que acepte este código desde su perfil.</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              {generatedAccess.tempPassword
                ? <>El operador iniciará sesión con estas credenciales y verá solo la pantalla de carga de documentos.</>
                : 'Se envió un email al operador con el código de invitación.'}
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setGeneratedAccess(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {/* Credenciales reseteadas */}
        {resetResult && (
          <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso reseteado — compartí las nuevas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CredField
                label="Email / Usuario"
                value={resetResult.email}
                copied={copied === 'reset-email'}
                onCopy={() => copyText(resetResult.email, 'reset-email')}
              />
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                  Nueva contraseña temporal
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                  <span className="flex-1 font-mono text-sm text-ink">
                    {showPassword ? resetResult.tempPassword : '••••••••••••'}
                  </span>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(resetResult.tempPassword, 'reset-pass')}
                    className={cn('text-ink-soft hover:text-ink', copied === 'reset-pass' && 'text-green-600')}
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              El operador deberá cambiar su contraseña al ingresar por primera vez con estas credenciales.
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setResetResult(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {/* Lista de operadores */}
        {operators.length === 0 && !showForm ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-zinc-50 text-zinc-300">
              <Users className="size-6" />
            </div>
            <p className="text-[13px] text-ink-soft">Todavía no hay personal autorizado para esta empresa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {operators.map((op) => (
              <li key={op.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-granate/10 bg-granate-tenue text-granate shadow-sm">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{op.name}</p>
                    <p className="truncate text-[12px] text-ink-soft">{op.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-[50px] sm:pl-0">
                  <StatusBadge status={op.isActive ? 'ok' : 'idle'}>
                    {op.isActive ? 'Activo' : 'Revocado'}
                  </StatusBadge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-600 hover:bg-amber-50"
                    onClick={() => handleReset(op.id)}
                    loading={reset.isPending}
                    title="Resetear acceso"
                  >
                    <KeyRound className="size-4" />
                  </Button>
                  {op.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => revoke.mutate(op.id)}
                      loading={revoke.isPending}
                      title="Revocar acceso"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function CredField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <span className="flex-1 font-mono text-sm text-ink">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className={cn('text-ink-soft hover:text-ink', copied && 'text-green-600')}
        >
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );
}
