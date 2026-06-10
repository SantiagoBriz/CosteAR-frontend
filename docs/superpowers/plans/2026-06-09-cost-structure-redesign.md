# CostStructurePage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rediseñar CostStructurePage a layout full-width estilo Excel con tabs por sección, y corregir "Cargar ejemplo" para que pre-llene el formulario sin guardar automáticamente.

**Architecture:** Layout de tabs horizontales (MP | MOD | CIP | Venta | Resultado). Cada tab muestra el formulario a ancho completo con tablas estilo spreadsheet. "Cargar ejemplo" llena el form localmente vía `reset()`; "Guardar sección" persiste en DB. Las forms exponen `preloadValues` prop para trigger externo de reset.

**Tech Stack:** React 19, react-hook-form, useFieldArray, TanStack Query, shadcn/ui, Tailwind CSS.

---

### Task 1: Corregir el bug de "Cargar ejemplo" en las 3 forms

**Problema:** `CostStructurePage.loadExample()` llama `updateSection.mutateAsync()` → guarda en DB sin que el usuario vea nada. La sección queda verde pero vacía visualmente.

**Fix:** Cada form acepta un prop `preloadValues?: T`. Cuando cambia (y no es null), el `useEffect` llama `reset(preloadValues)`. El parent setea estado local con el ejemplo sin tocar la DB.

**Files:**
- Modify: `src/features/cost-structures/RawMaterialForm.tsx`
- Modify: `src/features/cost-structures/DirectLaborForm.tsx`
- Modify: `src/features/cost-structures/IndirectCostsForm.tsx`

- [ ] **Step 1: Agregar `preloadValues` a RawMaterialForm**

```tsx
// src/features/cost-structures/RawMaterialForm.tsx
interface Props {
  defaultValues?: RawMaterialConfig;
  preloadValues?: RawMaterialConfig;   // ← nuevo
  onSave: (data: RawMaterialConfig) => Promise<void>;
  saving: boolean;
}

export function RawMaterialForm({ defaultValues, preloadValues, onSave, saving }: Props) {
  const { register, control, handleSubmit, reset } = useForm<RawMaterialConfig>({
    defaultValues: defaultValues ?? emptyRawMaterial(),
  });

  // Cuando llega data del servidor (inicial)
  useEffect(() => {
    if (defaultValues) reset(defaultValues);
  }, [defaultValues, reset]);

  // Cuando el usuario pide cargar ejemplo (sin guardar)
  useEffect(() => {
    if (preloadValues) reset(preloadValues);
  }, [preloadValues, reset]);
  // ... resto igual
}
```

- [ ] **Step 2: Agregar `preloadValues` a DirectLaborForm** — mismo patrón:

```tsx
interface Props {
  defaultValues?: DirectLaborConfig;
  preloadValues?: DirectLaborConfig;
  onSave: (data: DirectLaborConfig) => Promise<void>;
  saving: boolean;
}
// + useEffect para preloadValues igual que paso 1
```

- [ ] **Step 3: Agregar `preloadValues` a IndirectCostsForm** — mismo patrón:

```tsx
interface Props {
  defaultValues?: IndirectCostConfig;
  preloadValues?: IndirectCostConfig;
  onSave: (data: IndirectCostConfig) => Promise<void>;
  saving: boolean;
}
// + useEffect para preloadValues igual que paso 1
```

- [ ] **Step 4: Verificar build**
```bash
cd CosteAR-frontend && npx tsc --noEmit
```
Expected: sin errores en estos 3 archivos.

---

### Task 2: Rediseño completo de CostStructurePage — layout tabs

**Concepto:** Reemplazar la columna de acordeones por tabs horizontales. Cada tab = ancho completo.

```
┌─────────────────────────────────────────────────────────────┐
│ ← Empresa   Hamburguesa · 2026-06    [Calcular] [Exportar]  │
├─────────────────────────────────────────────────────────────┤
│ [MP ✓] [MOD ✓] [CIP ●] [Venta] [Resultado]                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Contenido del tab activo — ancho completo                 │
│   Tablas estilo spreadsheet, editables inline               │
│                                                             │
│   [Cargar ejemplo]              [Guardar sección →]         │
└─────────────────────────────────────────────────────────────┘
```

**Files:**
- Modify: `src/features/cost-structures/CostStructurePage.tsx` (reescritura total)

**Estado del parent para controlar preload:**
```tsx
type SectionTab = 'raw-material' | 'direct-labor' | 'indirect-costs' | 'sales' | 'result';

// En CostStructurePage:
const [activeTab, setActiveTab] = useState<SectionTab>('raw-material');
const [mpPreload, setMpPreload] = useState<RawMaterialConfig | undefined>();
const [modPreload, setModPreload] = useState<DirectLaborConfig | undefined>();
const [cipPreload, setCipPreload] = useState<IndirectCostConfig | undefined>();

// "Cargar ejemplo" SOLO hace reset local:
const loadExample = (section: SectionTab) => {
  if (section === 'raw-material') setMpPreload(catedraExample.rawMaterial);
  if (section === 'direct-labor') setModPreload(catedraExample.directLabor);
  if (section === 'indirect-costs') setCipPreload(catedraExample.indirectCosts);
};
```

- [ ] **Step 1: Escribir estructura de tabs + header**

```tsx
export function CostStructurePage() {
  const { id } = useParams({ from: '/cost-structures/$id' });
  const { data: structure, isLoading } = useCostStructure(id);
  const updateSection = useUpdateCostSection(id);
  const updateSales = useUpdateSales(id);
  const calculate = useCalculate(id);
  const { data: latest } = useLatestCalculation(id);

  const [activeTab, setActiveTab] = useState<SectionTab>('raw-material');
  const [mpPreload, setMpPreload]   = useState<RawMaterialConfig | undefined>();
  const [modPreload, setModPreload] = useState<DirectLaborConfig | undefined>();
  const [cipPreload, setCipPreload] = useState<IndirectCostConfig | undefined>();
  const [result, setResult]         = useState<CalculationResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const configured = {
    mp:  !!structure?.rawMaterialConfig,
    mod: !!structure?.directLaborConfig,
    cip: !!structure?.indirectCostConfig,
    sales: !!(structure?.salesUnitPrice && structure?.salesQuantity),
  };
  const allReady = configured.mp && configured.mod && configured.cip && configured.sales;

  const saveSection = async (
    section: 'raw-material' | 'direct-labor' | 'indirect-costs',
    config: unknown,
  ) => {
    setError(null);
    try {
      await updateSection.mutateAsync({ section, config });
      // avanzar al siguiente tab
      const next: Record<string, SectionTab> = {
        'raw-material': 'direct-labor',
        'direct-labor': 'indirect-costs',
        'indirect-costs': 'sales',
      };
      setActiveTab(next[section] ?? 'result');
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  const loadExample = (section: 'raw-material' | 'direct-labor' | 'indirect-costs') => {
    if (section === 'raw-material')   setMpPreload({ ...catedraExample.rawMaterial });
    if (section === 'direct-labor')   setModPreload({ ...catedraExample.directLabor });
    if (section === 'indirect-costs') setCipPreload({ ...catedraExample.indirectCosts });
  };

  const runCalculate = async () => {
    setError(null);
    try {
      const data = await calculate.mutateAsync();
      setResult(data.result);
      setActiveTab('result');
    } catch (e) { setError(apiErrorMessage(e)); }
  };

  if (isLoading) { /* spinner */ }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/companies/$id" params={{ id: structure?.companyId ?? '' }}
            className="mb-1 flex items-center gap-1 text-[13px] text-granate hover:text-action">
            <ArrowLeft className="size-3.5" /> Volver
          </Link>
          <h1 className="text-2xl font-bold text-ink">{structure?.productName}</h1>
          <p className="text-sm text-ink-soft">Período {structure?.period}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {/* export */}}>
            <Download className="size-4" /> Exportar
          </Button>
          <Button onClick={runCalculate} loading={calculate.isPending} disabled={!allReady}>
            <Calculator className="size-4" /> Calcular
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {/* Tab bar */}
      <SectionTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        configured={configured}
        hasResult={!!result || !!latest}
      />

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'raw-material' && (
          <SectionShell
            title="Materia Prima"
            description="Lote óptimo de Wilson · Política de stock · Ficha PPP"
            configured={configured.mp}
            onLoadExample={() => loadExample('raw-material')}
          >
            <RawMaterialForm
              defaultValues={structure?.rawMaterialConfig as RawMaterialConfig | undefined}
              preloadValues={mpPreload}
              onSave={(d) => saveSection('raw-material', d)}
              saving={updateSection.isPending}
            />
          </SectionShell>
        )}
        {activeTab === 'direct-labor' && (
          <SectionShell
            title="Mano de Obra Directa"
            description="Días hábiles · ITCS · Tarifa horaria por departamento"
            configured={configured.mod}
            onLoadExample={() => loadExample('direct-labor')}
          >
            <DirectLaborForm
              defaultValues={structure?.directLaborConfig as DirectLaborConfig | undefined}
              preloadValues={modPreload}
              onSave={(d) => saveSection('direct-labor', d)}
              saving={updateSection.isPending}
            />
          </SectionShell>
        )}
        {activeTab === 'indirect-costs' && (
          <SectionShell
            title="Costos Indirectos de Producción"
            description="Centros de costo · Prorrateo primario y secundario · Cuotas y variaciones"
            configured={configured.cip}
            onLoadExample={() => loadExample('indirect-costs')}
          >
            <IndirectCostsForm
              defaultValues={structure?.indirectCostConfig as IndirectCostConfig | undefined}
              preloadValues={cipPreload}
              onSave={(d) => saveSection('indirect-costs', d)}
              saving={updateSection.isPending}
            />
          </SectionShell>
        )}
        {activeTab === 'sales' && (
          <SalesTab
            defaultPrice={structure?.salesUnitPrice ? Number(structure.salesUnitPrice) : undefined}
            defaultQty={structure?.salesQuantity ? Number(structure.salesQuantity) : undefined}
            onSave={async (p, q) => {
              await updateSales.mutateAsync({ salesUnitPrice: p, salesQuantity: q });
              setActiveTab('result');
            }}
            saving={updateSales.isPending}
            allReady={allReady}
            onCalculate={runCalculate}
            calculating={calculate.isPending}
          />
        )}
        {activeTab === 'result' && (
          <ResultTab
            result={result}
            latest={latest ?? null}
            structureId={id}
          />
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Componente `SectionTabBar`**

```tsx
type SectionTab = 'raw-material' | 'direct-labor' | 'indirect-costs' | 'sales' | 'result';

const TABS: { id: SectionTab; label: string; icon: typeof Package; configKey?: keyof typeof configured }[] = [
  { id: 'raw-material',   label: 'Materia Prima',   icon: Package,    configKey: 'mp' },
  { id: 'direct-labor',  label: 'Mano de Obra',     icon: Users,      configKey: 'mod' },
  { id: 'indirect-costs',label: 'Costos Indirectos',icon: Factory,    configKey: 'cip' },
  { id: 'sales',         label: 'Venta',            icon: TrendingUp, configKey: 'sales' },
  { id: 'result',        label: 'Resultado',        icon: BarChart2 },
];

function SectionTabBar({ activeTab, onTabChange, configured, hasResult }) {
  return (
    <div className="flex gap-0 border-b border-line">
      {TABS.map(({ id, label, icon: Icon, configKey }) => {
        const isDone = configKey ? configured[configKey] : hasResult;
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-medium transition-colors',
              isActive
                ? 'border-granate text-granate'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            <Icon className="size-4" />
            {label}
            {isDone && <CheckCircle2 className="size-3.5 text-ok" />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Componente `SectionShell`** (wrapper de cada tab con header + botón ejemplo)

```tsx
function SectionShell({
  title, description, configured, onLoadExample, children,
}: {
  title: string; description: string; configured: boolean;
  onLoadExample: () => void; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-3">
            {configured && (
              <span className="flex items-center gap-1.5 text-[12px] text-ok">
                <CheckCircle2 className="size-3.5" /> Guardado
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={onLoadExample}>
              Cargar ejemplo
            </Button>
          </div>
        }
      />
      <CardBody className="p-0">
        {children}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: Mejorar estilos de las tablas dentro de los forms**

En cada form, las tablas deben seguir este patrón de "spreadsheet limpio":

```tsx
// Encabezados de tabla
<thead>
  <tr className="border-b-2 border-line bg-surface-alt">
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
      Concepto
    </th>
    // ...
  </tr>
</thead>
// Celdas editables
<td className="border-r border-line px-0">
  <input
    className="w-full border-0 bg-transparent px-3 py-2 text-sm text-ink focus:bg-action/5 focus:outline-none"
    // ...
  />
</td>
```

Aplicar en `RawMaterialForm`, `DirectLaborForm`, `IndirectCostsForm`.

- [ ] **Step 5: Tab Venta (SalesTab)**

```tsx
function SalesTab({ defaultPrice, defaultQty, onSave, saving, allReady, onCalculate, calculating }) {
  const { register, handleSubmit } = useForm<{ unitPrice: number; quantity: number }>({
    defaultValues: { unitPrice: defaultPrice, quantity: defaultQty },
  });
  return (
    <Card>
      <CardHeader title="Datos de venta" description="Precio y cantidad para calcular el margen bruto" />
      <CardBody>
        <form onSubmit={handleSubmit((v) => onSave(Number(v.unitPrice), Number(v.quantity)))}
          className="max-w-md space-y-4">
          <Input label="Precio de venta unitario $" type="number" step="0.01"
            {...register('unitPrice', { required: true, valueAsNumber: true })} />
          <Input label="Cantidad producida / vendida" type="number" step="1"
            {...register('quantity', { required: true, valueAsNumber: true })} />
          <div className="flex gap-3">
            <Button type="submit" variant="secondary" loading={saving}>
              Guardar precio
            </Button>
            {allReady && (
              <Button type="button" onClick={onCalculate} loading={calculating}>
                <Calculator className="size-4" /> Calcular ahora
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 6: Tab Resultado (ResultTab) con historial integrado**

```tsx
function ResultTab({ result, latest, structureId }) {
  const [view, setView] = useState<'result' | 'simulator' | 'history'>('result');
  const shown = result ?? (latest ? latestToResult(latest) : null);
  // ... mismos paneles de antes pero integrados en el tab
}
```

---

### Task 3: Verificar y hacer build

- [ ] **Step 1: Build completo**
```bash
cd CosteAR-frontend && npm run build
```
Expected: `✓ built in X.XXs` sin errores TypeScript.

- [ ] **Step 2: Commit**
```bash
git add src/features/cost-structures/
git commit -m "feat: rediseño CostStructurePage — tabs full-width + fix cargar ejemplo"
git push
```

- [ ] **Step 3: Deploy**
```bash
npx vercel deploy --prod
```
