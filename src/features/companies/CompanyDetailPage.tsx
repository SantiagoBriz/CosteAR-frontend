import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { Plus, FileSpreadsheet, ChevronRight, ArrowLeft, Users, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCompany, useCostStructures } from './company-hooks';
import { useCreateCostStructure } from '@/features/cost-structures/cost-structure-hooks';
import { useOperators, useGenerateOperatorAccess, useRevokeOperator, type GeneratedAccess } from '@/features/empresa-portal/empresa-portal-hooks';
import { apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; status: 'ok' | 'warn' | 'idle' }> = {
  DRAFT: { label: 'Borrador', status: 'idle' },
  ACTIVE: { label: 'Activa', status: 'ok' },
  ARCHIVED: { label: 'Archivada', status: 'idle' },
};

export function CompanyDetailPage() {
  const { id } = useParams({ from: '/companies/$id' });
  const { data: company } = useCompany(id);
  const { data: structures } = useCostStructures(id);
  const [showForm, setShowForm] = useState(false);

  return (
    <AppShell>
      <Link to="/companies" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-granate hover:text-action">
        <ArrowLeft className="size-4" /> Volver a clientes
      </Link>

      <PageHeader
        title={company?.name ?? 'Cliente'}
        description={company?.industry ?? undefined}
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Nueva estructura
          </Button>
        }
      />

      {showForm && <NewStructureForm companyId={id} onDone={() => setShowForm(false)} />}

      {/* Operadores de empresa */}
      <div className="mb-6">
        <OperatorsSection companyId={id} />
      </div>

      <Card>
        <CardHeader title="Estructuras de costos" description="Por producto y período" />
        <CardBody className="p-0">
          {!structures?.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <FileSpreadsheet className="size-8 text-idle" />
              <p className="text-sm text-ink-soft">Sin estructuras de costos todavía.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {structures.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/cost-structures/$id"
                    params={{ id: s.id }}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-surface-alt"
                  >
                    <div>
                      <div className="font-medium text-ink">{s.productName}</div>
                      <div className="text-[13px] text-ink-soft">Período {s.period}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={STATUS[s.status]?.status ?? 'idle'}>
                        {STATUS[s.status]?.label ?? s.status}
                      </StatusBadge>
                      <ChevronRight className="size-5 text-idle" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Sección de operadores de empresa
// ---------------------------------------------------------------------------

function OperatorsSection({ companyId }: { companyId: string }) {
  const { data: operators = [] } = useOperators(companyId);
  const generate = useGenerateOperatorAccess(companyId);
  const revoke = useRevokeOperator();
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

  return (
    <Card>
      <CardHeader
        title="Personal autorizado"
        description="Usuarios de esta empresa que pueden cargar documentos al portal"
        action={
          <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Invitar operador
          </Button>
        }
      />
      <CardBody>
        {/* Formulario de invitación */}
        {showForm && (
          <div className="mb-5 rounded-md bg-surface-alt p-4 animate-rise space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre completo"
                placeholder="Ej: María García"
                value={operatorFullName}
                onChange={(e) => setOperatorFullName(e.target.value)}
              />
              <Input
                label="Cargo / área (opcional)"
                placeholder="Ej: Compras, Administración…"
                value={operatorRole}
                onChange={(e) => setOperatorRole(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Email"
                type="email"
                placeholder="maria@empresa.com"
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
              />
              {operatorEmail.length > 0 && !emailValid && (
                <p className="mt-1 text-[12px] text-danger">Email inválido</p>
              )}
            </div>
            <p className="text-[12px] text-ink-soft">
              El operador recibirá un email con sus credenciales temporales y podrá cambiar su contraseña al ingresar.
            </p>
            {generateError && (
              <p className="rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{generateError}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleGenerate} loading={generate.isPending} disabled={!operatorFullName.trim() || !emailValid}>
                Generar acceso y enviar invitación
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Credenciales generadas — mostrar UNA SOLA VEZ */}
        {generatedAccess && (
          <div className="mb-5 rounded-md border border-action/30 bg-action/5 p-4 animate-rise">
            <p className="mb-3 text-[13px] font-semibold text-ink">
              Acceso generado — compartí estas credenciales con el operador. Solo se muestran una vez.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CredField
                label="Email / Usuario"
                value={generatedAccess.email}
                copied={copied === 'email'}
                onCopy={() => copyText(generatedAccess.email, 'email')}
              />
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-soft mb-1">
                  Contraseña temporal
                </label>
                <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
                  <span className="flex-1 font-mono text-sm text-ink">
                    {showPassword ? generatedAccess.tempPassword : '••••••••••••'}
                  </span>
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-ink-soft hover:text-ink">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(generatedAccess.tempPassword, 'pass')}
                    className={cn('text-ink-soft hover:text-ink', copied === 'pass' && 'text-green-600')}
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-ink-soft">
              El operador iniciará sesión en <strong>costear-frontend.vercel.app</strong> con estas credenciales y verá solo la pantalla de carga de documentos.
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setGeneratedAccess(null)}>
              Entendido, cerrar
            </Button>
          </div>
        )}

        {/* Lista de operadores */}
        {operators.length === 0 && !showForm ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="size-8 text-ink-soft/40" />
            <p className="text-[13px] text-ink-soft">Todavía no hay personal autorizado para esta empresa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {operators.map((op) => (
              <li key={op.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-surface-alt text-ink-soft">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{op.name}</p>
                    <p className="text-[12px] text-ink-soft">{op.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={op.isActive ? 'ok' : 'idle'}>
                    {op.isActive ? 'Activo' : 'Revocado'}
                  </StatusBadge>
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
      <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2">
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

// ---------------------------------------------------------------------------

function NewStructureForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const create = useCreateCostStructure(companyId);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ productName: string; period: string }>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await create.mutateAsync(values);
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  });

  return (
    <Card className="mb-6 animate-rise">
      <CardBody>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Producto" {...register('productName', { required: true })} />
          <Input label="Período (YYYY-MM)" placeholder="2026-06" {...register('period', { required: true })} />
          {error && (
            <div className="sm:col-span-2 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" loading={formState.isSubmitting}>
              Crear
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
