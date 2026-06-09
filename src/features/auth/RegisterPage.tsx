import { useState, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRegister, type RegisterPayload, type ProfessionalType } from './auth-hooks';
import { apiErrorMessage, api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STEPS = ['Cuenta', 'Datos profesionales', 'Tu cartera', 'Preferencias'] as const;

const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string }[] = [
  { value: 'CONTADOR_PUBLICO', label: 'Contador Público' },
  { value: 'LIC_ADMINISTRACION', label: 'Lic. en Administración' },
  { value: 'CONSULTOR_INDEPENDIENTE', label: 'Consultor independiente' },
  { value: 'ANALISTA_INTERNO', label: 'Analista interno' },
  { value: 'OTRO', label: 'Otro' },
];

interface ClientDraft {
  name: string;
  industry: string;
  cuit: string;
}

type Draft = {
  name: string;
  email: string;
  password: string;
  cuit: string;
  dni: string;
  professionalType: ProfessionalType | '';
  licenseNumber: string;
  province: string;
  hasClients: boolean | null;
  clients: ClientDraft[];
  marginThresholdPct: number;
};

const EMPTY: Draft = {
  name: '',
  email: '',
  password: '',
  cuit: '',
  dni: '',
  professionalType: '',
  licenseNumber: '',
  province: 'Tucumán',
  hasClients: null,
  clients: [],
  marginThresholdPct: 15,
};

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [cuitTaken, setCuitTaken] = useState(false);
  const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cuitCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-formatea el input de CUIT a XX-XXXXXXXX-X mientras el usuario escribe.
  const formatCuit = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  };

  const CUIT_COMPLETE = /^\d{2}-\d{8}-\d$/;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    // Auto-formatear CUIT antes de guardarlo en el draft
    const finalValue = key === 'cuit' ? formatCuit(value as string) as Draft[K] : value;
    setDraft((d) => ({ ...d, [key]: finalValue }));

    if (key === 'email') {
      setEmailTaken(false);
      if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
      const val = value as string;
      if (/\S+@\S+\.\S+/.test(val)) {
        emailCheckRef.current = setTimeout(async () => {
          try {
            const res = await api.get<{ data: { available: boolean } }>(`/auth/check-email?email=${encodeURIComponent(val)}`);
            setEmailTaken(!res.data.data.available);
          } catch { /* ignorar errores de red */ }
        }, 600);
      }
    }
    if (key === 'cuit') {
      setCuitTaken(false);
      if (cuitCheckRef.current) clearTimeout(cuitCheckRef.current);
      const formatted = formatCuit(value as string);
      // Disparar el check AJAX solo cuando el CUIT está completo (11 dígitos)
      if (CUIT_COMPLETE.test(formatted)) {
        cuitCheckRef.current = setTimeout(async () => {
          try {
            const res = await api.get<{ data: { available: boolean } }>(`/auth/check-cuit?cuit=${encodeURIComponent(formatted)}`);
            setCuitTaken(!res.data.data.available);
          } catch { /* ignorar errores de red */ }
        }, 400);
      }
    }
  };

  // Validación mínima por paso para habilitar "Continuar".
  const canContinue = (): boolean => {
    if (step === 0) return (
      draft.name.length >= 2 &&
      EMAIL_RE.test(draft.email) &&
      CUIT_RE_COMPLETE.test(draft.cuit) &&
      passwordStrength(draft.password) === 4 &&
      !emailTaken &&
      !cuitTaken
    );
    if (step === 1) return !!draft.professionalType;
    if (step === 2) return draft.hasClients !== null;
    return true;
  };

  const submit = async () => {
    setError(null);
    const payload: RegisterPayload = {
      name: draft.name,
      email: draft.email,
      password: draft.password,
      cuit: draft.cuit,
      dni: draft.dni || undefined,
      professionalType: draft.professionalType as ProfessionalType,
      licenseNumber: draft.licenseNumber || undefined,
      province: draft.province,
      marginThresholdPct: draft.marginThresholdPct,
      initialClients: draft.hasClients
        ? draft.clients
            .filter((c) => c.name.trim().length >= 2)
            .map((c) => ({
              name: c.name.trim(),
              industry: c.industry.trim() || undefined,
              cuit: c.cuit.trim() || undefined,
            }))
        : undefined,
    };
    try {
      await register.mutateAsync(payload);
      await navigate({ to: '/dashboard' });
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      // Si el email ya existe, volver al paso 0 para que el error sea visible
      if ((e as { response?: { status?: number } })?.response?.status === 409) {
        setStep(0);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6 py-12">
      <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-8 shadow-sm animate-rise">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-action font-bold text-white">C</div>
          <span className="text-xl font-bold tracking-tight text-granate">CosteAR</span>
        </div>

        <Stepper step={step} />

        <div className="mt-7 space-y-5">
          {step === 0 && <StepAccount draft={draft} set={set} emailTaken={emailTaken} cuitTaken={cuitTaken} />}
          {step === 1 && <StepProfessional draft={draft} set={set} />}
          {step === 2 && <StepClients draft={draft} set={set} />}
          {step === 3 && <StepPreferences draft={draft} set={set} />}
        </div>

        {error && (
          <div className="mt-5 rounded-sm bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
        )}

        <div className="mt-7 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Atrás
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()}>
              Continuar <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={register.isPending}>
              Crear cuenta
            </Button>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-soft">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-granate hover:text-action">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center">
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                i < step
                  ? 'bg-granate text-white'
                  : i === step
                    ? 'bg-action text-white'
                    : 'bg-surface-alt text-ink-soft border border-line',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1', i < step ? 'bg-granate' : 'bg-line')} />
            )}
          </div>
          <span className={cn('text-[11px]', i === step ? 'font-medium text-ink' : 'text-ink-soft')}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

type SetFn = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PASSWORD_RULES = [
  { label: 'Mínimo 10 caracteres', test: (p: string) => p.length >= 10 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
];

function passwordStrength(p: string): number {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

// CUIT completo: XX-XXXXXXXX-X (exactamente 11 dígitos con guiones auto-insertados)
const CUIT_RE_COMPLETE = /^\d{2}-\d{8}-\d$/;

function StepAccount({ draft, set, emailTaken, cuitTaken }: { draft: Draft; set: SetFn; emailTaken: boolean; cuitTaken: boolean }) {
  const emailInvalid = draft.email.length > 0 && !EMAIL_RE.test(draft.email);

  // Lógica de feedback del CUIT:
  // - Mientras escribe: nada (los guiones se insertan solos)
  // - Cuando hay dígitos pero no completo (< 11): "Formato incompleto"
  // - Cuando tiene 11 dígitos (formato XX-XXXXXXXX-X): check AJAX automático
  const cuitDigits = draft.cuit.replace(/\D/g, '');
  const cuitTyping = cuitDigits.length > 0 && cuitDigits.length < 11;
  const cuitComplete = CUIT_RE_COMPLETE.test(draft.cuit);

  const strength = passwordStrength(draft.password);
  const strengthColors = ['bg-danger', 'bg-danger', 'bg-yellow-400', 'bg-yellow-400', 'bg-green-500'];
  const strengthLabels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte'];

  return (
    <>
      <h2 className="text-xl font-bold text-ink">Creá tu cuenta</h2>
      <Input label="Nombre y apellido" value={draft.name} onChange={(e) => set('name', e.target.value)} />
      <div>
        <Input label="Email" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
        {emailInvalid && !emailTaken && (
          <p className="mt-1 text-[12px] text-danger">Ingresá un email válido (ej: nombre@dominio.com)</p>
        )}
        {emailTaken && !emailInvalid && (
          <p className="mt-1 text-[12px] text-danger">Ya existe una cuenta con ese email. <Link to="/login" className="underline">Iniciá sesión</Link></p>
        )}
      </div>
      <div>
        <Input
          label="CUIT / CUIL"
          placeholder="20-12345678-9"
          value={draft.cuit}
          inputMode="numeric"
          onChange={(e) => set('cuit', e.target.value)}
        />
        {cuitTyping && (
          <p className="mt-1 text-[12px] text-yellow-600">
            Formato: XX-XXXXXXXX-X — faltan {11 - cuitDigits.length} dígitos
          </p>
        )}
        {cuitComplete && !cuitTaken && (
          <p className="mt-1 flex items-center gap-1 text-[12px] text-green-600">
            <Check className="size-3" /> CUIT válido
          </p>
        )}
        {cuitTaken && cuitComplete && (
          <p className="mt-1 text-[12px] text-danger">
            Ese CUIT ya tiene una cuenta.{' '}
            <Link to="/login" className="underline">Iniciá sesión</Link>
          </p>
        )}
      </div>
      <div>
        <Input
          label="Contraseña"
          type="password"
          value={draft.password}
          onChange={(e) => set('password', e.target.value)}
        />
        {draft.password.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1">
              {PASSWORD_RULES.map((_, i) => (
                <div
                  key={i}
                  className={cn('h-1 flex-1 rounded-full transition-colors', i < strength ? strengthColors[strength] : 'bg-line')}
                />
              ))}
            </div>
            <p className="text-[11px] text-ink-soft">{strengthLabels[strength]}</p>
            <div className="space-y-1">
              {PASSWORD_RULES.map((rule) => (
                <div key={rule.label} className={cn('flex items-center gap-1.5 text-[12px]', rule.test(draft.password) ? 'text-green-500' : 'text-ink-soft')}>
                  <div className={cn('size-3 rounded-full border', rule.test(draft.password) ? 'bg-green-500 border-green-500' : 'border-line')} />
                  {rule.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StepProfessional({ draft, set }: { draft: Draft; set: SetFn }) {
  return (
    <>
      <h2 className="text-xl font-bold text-ink">Tus datos profesionales</h2>
      <Input
        label="DNI (opcional)"
        placeholder="12345678"
        value={draft.dni}
        onChange={(e) => set('dni', e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
          Tipo de profesional
        </label>
        <select
          className="h-11 rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-granate"
          value={draft.professionalType}
          onChange={(e) => set('professionalType', e.target.value as ProfessionalType)}
        >
          <option value="">Seleccioná…</option>
          {PROFESSIONAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Matrícula (opcional)"
          placeholder="CPCE…"
          value={draft.licenseNumber}
          onChange={(e) => set('licenseNumber', e.target.value)}
        />
        <Input label="Provincia" value={draft.province} onChange={(e) => set('province', e.target.value)} />
      </div>
    </>
  );
}

function StepClients({ draft, set }: { draft: Draft; set: SetFn }) {
  const addClient = () => set('clients', [...draft.clients, { name: '', industry: '', cuit: '' }]);
  const updateClient = (i: number, patch: Partial<ClientDraft>) =>
    set('clients', draft.clients.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeClient = (i: number) => set('clients', draft.clients.filter((_, idx) => idx !== i));

  return (
    <>
      <h2 className="text-xl font-bold text-ink">Tu cartera</h2>
      <p className="text-sm text-ink-soft">¿Ya tenés clientes (PyMEs) que querés cargar ahora?</p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            set('hasClients', true);
            if (draft.clients.length === 0) addClient();
          }}
          className={cn(
            'rounded-md border px-4 py-3 text-sm font-medium transition-colors',
            draft.hasClients === true
              ? 'border-granate bg-granate-tenue text-granate'
              : 'border-line text-ink hover:bg-surface-alt',
          )}
        >
          Sí, cargar ahora
        </button>
        <button
          type="button"
          onClick={() => set('hasClients', false)}
          className={cn(
            'rounded-md border px-4 py-3 text-sm font-medium transition-colors',
            draft.hasClients === false
              ? 'border-granate bg-granate-tenue text-granate'
              : 'border-line text-ink hover:bg-surface-alt',
          )}
        >
          Más tarde
        </button>
      </div>

      {draft.hasClients && (
        <div className="space-y-3">
          {draft.clients.map((c, i) => (
            <div key={i} className="rounded-md border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wide text-ink-soft">
                  Cliente {i + 1}
                </span>
                <button type="button" onClick={() => removeClient(i)} className="text-ink-soft hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input placeholder="Nombre" value={c.name} onChange={(e) => updateClient(i, { name: e.target.value })} />
                <Input placeholder="Rubro" value={c.industry} onChange={(e) => updateClient(i, { industry: e.target.value })} />
                <Input placeholder="CUIT (opc.)" value={c.cuit} onChange={(e) => updateClient(i, { cuit: e.target.value })} />
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addClient}>
            <Plus className="size-4" /> Agregar otro cliente
          </Button>
        </div>
      )}
    </>
  );
}

function StepPreferences({ draft, set }: { draft: Draft; set: SetFn }) {
  return (
    <>
      <h2 className="text-xl font-bold text-ink">Preferencias</h2>
      <Input
        label="Umbral de alerta de margen (%)"
        type="number"
        step="0.1"
        numeric
        hint="Te avisamos cuando el margen de un cliente caiga por debajo de este valor"
        value={draft.marginThresholdPct}
        onChange={(e) => set('marginThresholdPct', Number(e.target.value))}
      />
      <div className="rounded-md bg-surface-alt p-4 text-[13px] text-ink-soft">
        Vas a poder activar la <strong className="text-ink">verificación en dos pasos (2FA)</strong> desde
        tu perfil una vez dentro, para máxima seguridad de tu cuenta.
      </div>
    </>
  );
}
