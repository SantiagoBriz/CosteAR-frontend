# Decisiones — Trazabilidad Total v1 (frontend)

Registro de decisiones tomadas de forma autónoma al portar la sección D de la
spec "Trazabilidad Total v1" al frontend real, branch `feature/trazabilidad`.
Regla general: ante ambigüedad, default más simple que cumpla la spec sin
romper pantallas existentes ni arriesgar pérdida de datos. Contraparte
backend: `Git back/DECISIONES.md` (ahí está todo lo de F1-F5 del lado del
servidor, ya implementado antes de esta sesión).

## Alcance y qué NO se tocó

- **No se reemplazó ningún flujo existente.** Los 4 formularios de carga
  (Materia Prima, Mano de Obra, Costos Indirectos, Venta), el cálculo legado
  (`POST /cost-structures/:id/calculate`) y el panel de resultados
  (`ResultPanel`) siguen funcionando exactamente igual. Todo lo nuevo se
  agregó al lado, nunca en reemplazo.
- La pestaña **Historial** no se tocó — la spec (sección D que me pasaron)
  no la menciona entre los 5 puntos a implementar; solo el manual completo
  (que no fue el prompt de esta sesión) sugiere alimentarla desde `/runs`.
  Se puede hacer en una iteración futura sin fricción (el hook
  `useStructureRuns` ya existe).

## Gap de backend encontrado y corregido

Al conectar el árbol real (`GET /calculation-runs/:id/tree`) descubrí que
ningún nodo traía nunca `sourceDpVersionIds` poblado — el campo estaba en el
schema pero el motor nunca lo completaba. Consecuencia: "toda hoja con
sources es clickeable" (D.2) no se podía cumplir con NINGÚN dato real, ni
siquiera con la estructura de ejemplo del seed. Como es un fix acotado,
aditivo y que no toca ni un número del motor (verificado: 193 tests del
backend siguen en verde, incluido el fixture de regresión R5), lo hice en
`Git back` (branch `AlanSandbox`, commit local, sin push) en vez de trabajar
con una demo que nunca se pudiera probar de punta a punta. Detalle técnico en
`Git back/DECISIONES.md`, sección "Addendum — integración con el frontend
real".

**Interpretación pragmática de "hoja con sources":** el enriquecimiento
adjunta el id del DataPoint tanto a las 4 raíces (MP/MOD/CIP/VENTA, si existe
el DataPoint de bloque migrado) como a cualquier nodo interno cuyo `label`
coincida con un DataPoint real (cubre los movimientos de MP creados desde el
frontend, ver más abajo). Esto es un superconjunto de "toda hoja" — las
raíces técnicamente no son hojas (tienen hijos) pero también quedan
clickeables, porque es la única forma de mostrar trazabilidad real en una
estructura recién migrada donde todavía no se cargó ningún movimiento nuevo
campo por campo. No hay downside: simplemente da más puntos de entrada a la
ficha del dato, nunca menos.

## Árbol de derivación (D.1) — `DerivationTree.tsx`

- Se agregó como tarjeta nueva en la pestaña **Resultado**, ARRIBA de la
  tabla de desglose existente (que sigue igual). Si no hay `run` (ni de esta
  sesión ni uno previo cacheado vía `GET /structures/:id/runs`), muestra
  "Presioná Calcular" — nunca números sin run, tal como pide la spec.
- **Calcular ahora dispara dos llamadas**: la legada
  (`POST /cost-structures/:id/calculate`, sin cambios, sigue llenando
  `ResultPanel`) y la nueva de trazabilidad
  (`POST /structures/:id/calculate`). Son independientes a propósito: la
  nueva tiene una validación extra (bloquea si hay datos sin imputar, D.3) y
  si falla, el resultado de siempre se sigue viendo igual — el aviso de error
  queda contenido adentro de la caja del árbol, nunca tapa la pantalla.
- Filas clickeables: subrayado punteado + cursor pointer, exactamente en los
  nodos que el backend marcó con `sourceDpVersionIds` no vacío. Un único
  acordeón abierto a la vez (estado por `dataPointId`, no por nodo — si dos
  nodos apuntan al mismo dato, comparten estado, que es lo esperable).

## Ficha del dato (D.2) — `TraceCard`, dentro del mismo archivo

Implementada 1:1 contra el contrato de `GET /data-points/:id/trace`: estado +
firma, grilla de autores por campo (rol, área, hora exacta con segundos y
zona horaria `America/Argentina/Tucuman`), método + dispositivo, comprobante
(con link "Ver comprobante" si `evidence.fileUrl` existe), períodos (hecho /
captación / imputado), historial de versiones con las anteriores tachadas,
"Impacta en" como cadena, botón "Pedir revisión" (con comentario obligatorio,
llama `POST /data-points/:id/pedir-revision`), id inmutable al pie. Borde
izquierdo granate usando el token existente de la app (`border-granate`, la
paleta real de CosteAR) en vez del hex literal `#6E1423` del mockup original
— mantiene consistencia con el resto de la UI, que ya usa su propio granate.

**Pill de estado (D.4)**: se muestra en el header de la TraceCard (que ya
trae `status` en la respuesta) y también junto a cada fila clickeable del
árbol — ahí no hay un endpoint de "listar data points de la estructura", así
que el estado de las filas se resuelve reusando el mismo fetch de `/trace`
que dispara el click (React Query cachea por `dataPointId`; no hay llamadas
extra). No inventé un endpoint nuevo para esto.

## Doble período (D.3)

- Badge "Período de costo: YYYY-MM" + "Captación: continua" en el header de
  `CostStructurePage`, siempre visible.
- El modal de imputación (`ImputacionModal.tsx`) y la función
  `proposeImputation` (`imputacion.ts`, calco de la del manual) viven en el
  frontend porque el backend **no decide esto solo** — `POST
  /structures/:id/data-points` deja `periodoImputado` en `NULL` siempre; la
  propuesta automática vs. modal es responsabilidad de quien llama.
- **Punto de enganche elegido: movimientos nuevos de Materia Prima.** Es el
  único lugar de la UI actual donde ya existe una fecha por ítem
  (`StockMovement.date`) y el propio manual usa exactamente ese ejemplo
  ("Compra — Proveedor Central"). Al guardar la sección de MP, cualquier
  movimiento agregado en esa sesión de edición (detectado comparando contra
  la cantidad de movimientos que ya traía la estructura al abrir el form, no
  por id) se registra como DataPoint(s) reales: dos hermanos
  (`mp.compra.cantidad` por Depósito + `mp.compra.precio` por Contaduría,
  unidos por `valueJson.movementId`) para compras, uno solo
  (`mp.consumo.cantidad`, área Planta) para consumos — tal como especifica
  el manual §1.1. Si la fecha cae en el período de la estructura, se imputa
  solo (sin modal); si no, se encola el modal (uno por movimiento, en serie).
- **No se extendió este flujo a Mano de Obra ni a Costos Indirectos**: esas
  secciones son configuración agregada (un blob por estructura, sin fecha
  por ítem) — no hay con qué disparar la regla de imputación sin inventar un
  campo de fecha que la spec no pide. Se puede sumar en una iteración futura
  si se necesita.
- **Mismo usuario como autor de cantidad y precio**: la UI actual no tiene
  selector de "quién soy en este movimiento" (área/persona), así que ambos
  campos quedan firmados por el usuario logueado, con las áreas correctas
  (`deposito`/`contaduria`) igual — así se ve en la ficha "autores distintos
  por campo" en el sentido de rol/área, aunque el nombre de persona coincida
  en este demo de un solo usuario.

## F5 — Pulido

- **(a) IAP de solo lectura** y **(c) keys estables por id de centro**: ya
  estaban bien en este repo (verificado leyendo el código, no solo
  asumido) — `DirectLaborForm` ya filtra cualquier "IAP" manual y lo muestra
  derivado en el Resultado; `IndirectCostsForm` ya usa `center.id` (no
  `name`) como clave de `distribution`/`productiveSettings`. No hubo que
  tocar nada.
- **(b) Flag "cambios sin guardar"**: el patrón existente (`react-hook-form`
  `isDirty` + `reset()` al recargar `defaultValues`) ya se limpiaba solo en
  la mayoría de los casos, pero dependía del timing del refetch tras
  invalidar la query. Se hizo explícito e inmediato: los 4 formularios
  (`RawMaterialForm`, `DirectLaborForm`, `IndirectCostsForm`, `SalesTab`)
  ahora llaman `reset()` con los datos recién guardados apenas el `onSave`
  resuelve, sin esperar al refetch.
- **(d) MOD: placeholders + "Cargar ejemplo"**: `catedra-example.ts` ya
  existía en el repo con los valores exactos de la cátedra pero no estaba
  conectado a ninguna pantalla. Se agregó el botón "Cargar ejemplo de la
  cátedra" en `DirectLaborForm` (arriba del todo), que hace `reset()` con
  ese fixture. Los defaults de un formulario vacío (`emptyDirectLabor()`)
  no se tocaron porque ya eran neutros (0 en todo salvo días calendario
  reales — 52 domingos/sábados — que no son "datos de demo", son
  aritmética del año).

## Verificación

- `npm run typecheck` (frontend) y `npm run typecheck` + `npm run test`
  (backend, 193 tests) en verde después de todos los cambios.
- Verificación manual en Chrome contra el backend local real: ver el resumen
  final de la sesión para el paso a paso.

---

## Sesión 2026-07-11 — Correcciones puntuales (F6, Parte 5)

- **(a) Horas presupuestadas**: en `DirectLaborForm` el campo de horas era
  "Horas trabajadas"; se renombró a "Horas presupuestadas" (encabezado + celda)
  y se agregó una nota: son la capacidad normal para la tarifa, no las horas
  reales (esas son el dato de fin de mes). En `ValidacionesPage` el dato viene
  del portal del operador y SÍ es real, así que se etiquetó "Horas trabajadas
  (real)" en vez de renombrar mal (criterio C: real y presupuestado siempre
  etiquetados).
- **(b) Real vs presupuestado en CIF**: la tabla de centros productivos ahora
  tiene un encabezado agrupador ("Presupuestado (calculado)" | "Datos reales
  (fin de mes)") y un separador vertical entre ambos grupos, para no mezclarlos.
- **(d) Período de costo**: ya se mostraba como badge dentro de la estructura
  ("Período de costo: YYYY-MM" + "Captación: continua"); se deja como está.
- **(e) Líneas bordó sobrantes**: los `focus:border-granate` y los headers
  `text-granate-deep` son tema de marca (correctos). Se quitó el único artefacto
  claro: un `border-t` huérfano que dibujaba una línea parcial bajo los
  subheaders "Fijo %/Var %" del prorrateo secundario. El artefacto exacto que
  vio el equipo conviene confirmarlo con un screenshot; el resto del granate es
  intencional.
- **(5.4) IAP**: en el Resultado se muestra "IAP — Inasistencias pagas" con la
  fórmula derivada ("= N días pagos / M efectivos = X%") y la aclaración
  "derivado, solo lectura". El numerador viene del backend (`paidDays`), no se
  inventa en el front.

---

## Sesión 2026-07-11 (cont.) — Trazabilidad visible + escalonado en la UI

- **Pestaña nueva de trazabilidad (F5, Parte 2.3)**: dos rutas internas nuevas
  (`/trazabilidad/dato/$id` y `/trazabilidad/calculo/$runId`) que abren una
  página COMPLETA dentro de la app (mismo layout, mismo login), formato
  comprobante e imprimible (botón Imprimir → window.print). Nunca un dominio
  externo ni un modal del navegador. Se agregaron botones "Abrir en pestaña
  nueva" (target _blank) en el árbol de derivación (encabezado → Ver cálculo)
  y en la ficha in-place del dato (→ Ver dato). La página de cálculo trae un
  selector de corrida (cada recálculo es un snapshot) para abrir varias
  pestañas y comparar; el período de la estructura viaja por query param y se
  muestra como badge.
  - Decisión: el "selector de período" se implementó como selector de CORRIDAS
    reales (las que devuelve `/structures/:id/runs`), que es el eje temporal
    que existe hoy en los datos. El período de costo (atributo de la estructura)
    se muestra como badge. Comparar dos PERÍODOS distintos = abrir dos
    estructuras distintas en dos pestañas (cada una con su período en la URL).
- **Escalonado usable en la UI (Parte 4.4)**: la tabla del prorrateo secundario
  ahora permite repartir a productivos Y a otros servicios (un servicio puede
  entregar a otro que aún no cerró); la columna del propio servicio queda
  bloqueada. El **orden de las filas es el orden de cierre** (con número y
  flechas ▲▼ para reordenar). Al guardar, `closureOrder` se deriva de ese orden
  y activa el motor escalonado. Retrocompatible: con un solo servicio o
  servicios que solo reparten a productivos, el resultado es idéntico al
  directo (no cambia FX1/FX3).

---

## Sesión 2026-07-11 (cont.) — Navegación lista→detalle MP (F4, Parte 3.1)

- **RawMaterialForm** pasó a ser un wrapper LISTA→FICHA: la lista muestra todas
  las materias primas de la estructura (código, nombre, unidad, proveedor,
  costo unitario, existencia inicial, estado) con "Agregar materia prima";
  al hacer click en una se entra a su ficha exclusiva (el form de siempre:
  Wilson propio, política de stock, ficha PPP de movimientos con trazabilidad),
  precedida por la sección "Identificación" (codificación real de mercado) y un
  breadcrumb "Volver a la lista".
- Retrocompat: `toMaterialsList` normaliza la MP única legada a una fila; el
  onSave persiste la sección `{ materials: [...] }` que el backend acepta.
- La lógica de trazabilidad de movimientos nuevos (DataPoints + imputación) se
  conserva por materia prima dentro de la ficha.

---

## Sesión 2026-07-11 (cont.) — CIF lista→ficha por centro (F4, Parte 3.3)

- **CostCentersView**: el tab Costos Indirectos ahora abre en la LISTA de
  centros de costo (tipo productivo/servicio, presupuesto F/V derivado, cuota,
  estado) con la sobreaplicación neta global visible; "Editar configuración"
  alterna al formulario de siempre (que sigue teniendo el escalonado, etc.).
- **Ficha por centro**: conceptos del primario que lo tocan (con su peso),
  presupuesto derivado (fijo/variable/total), cuota predeterminada con su
  fórmula (presupuesto ÷ capacidad normal), datos reales (cap. normal /
  actividad real / CIP real), CIP aplicado y variaciones ETIQUETADAS con su
  lectura contable (favorable/desfavorable, ahorro/exceso, sobre/subaplicación,
  capacidad ociosa). Para servicios: qué reparte y su posición en el orden de
  cierre. Todo LEÍDO del cálculo persistido — el front no recalcula.

---

## Sesión 2026-07-11 (cont.) — MOD lista→ficha por departamento (F4, Parte 3.2)

- **LaborDepartmentsView**: el tab Mano de Obra abre en la LISTA de
  departamentos (remuneración, horas presupuestadas, tarifa, estado) con los
  datos compartidos de la estructura arriba (días efectivos, IAP, ITCS); toggle
  "Editar configuración" al formulario. Ficha por departamento: días efectivos,
  ITCS con su árbol (CSC/B40/F40/B47), tarifa horaria integral con su fórmula,
  y HORAS presupuestadas vs reales separadas y etiquetadas. Detalle por operario
  solo si el modelo los tiene.
- **DirectLaborForm**: columna nueva "Horas reales (fin de mes)" separada de las
  presupuestadas, opcional. Con esto Parte 3 queda completa (MP, MOD, CIF).

---

## Sesión 2026-07-11 (cont.) — UI del historial de config (R1)

- **ConfigHistoryPanel**: panel colapsable "Historial de cambios · APPEND-ONLY"
  al pie de cada sección (MP/MOD/CIF), que lee `GET
  /cost-structures/:id/config-history?section=`. Lista las versiones (más nueva
  primero) con un resumen legible por sección (N materias primas / N
  departamentos / N centros·conceptos / precio×cantidad), timestamp en zona
  America/Argentina/Tucuman, marca "VIGENTE" en la última y JSON expandible del
  snapshot. Hace visible que la fuente de verdad se versiona y nunca se pisa (R1).

---

## Sesión 2026-07-20 — T00: sync AlanSandbox ↔ staging (VERIFICADO, sin merge necesario)

- **Hallazgo (contradice la premisa de la tarea):** al mapear la divergencia en
  vivo el 2026-07-20, `AlanSandbox` y `origin/staging` **NO están divergidos**.
  `origin/staging` está **totalmente contenido** en `AlanSandbox`:
  - `git log --oneline AlanSandbox..origin/staging` → **vacío** (staging no tiene
    ningún commit que AlanSandbox no tenga).
  - `git merge-base AlanSandbox origin/staging` == `origin/staging` tip ==
    `c95a503` (el mismo "fix(ui): etiqueta de prorrateo engañosa..." que la tarea
    citaba como exclusivo de staging → ya está en AlanSandbox).
  - `git merge-base --is-ancestor origin/staging AlanSandbox` → **YES**.
  - `git merge origin/staging` → **"Already up to date."**
- **Causa:** el sync ya se hizo en un merge previo (`43e6863 Merge
  remote-tracking branch 'origin/staging' into AlanSandbox`), y encima de eso
  AlanSandbox agregó `641925c feat(ui): render GASTO cost sections...`. La ruta
  `merge/lautaro-a-dev` / `b3225ab` ya había llevado la trazabilidad + import
  Excel a staging, tal como anticipaba la tarea.
- **Ambos feature sets confirmados presentes en AlanSandbox** (rule #9, default
  simple): Excel import (`759d91c`, `5ad8423 popup de revisión`, `b3225ab`),
  trazabilidad periodos+comparación (`b3225ab`), F4 lista→ficha (MP/MOD/CIF),
  historial config append-only (`dc9e4c8`), y el fix del panel de resultado
  (`8824ba0 mapear latest + costo unitario`).
- **Decisión:** NO se crea ningún merge commit (sería un commit vacío/stray,
  viola rule #3). El `package-lock.json` es idéntico a staging; `npm install`
  reporta "up to date". Verificación de salud del branch (base limpia para el
  trabajo nuevo): `npm run typecheck` ✅, `npm run build` ✅ (solo avisos
  preexistentes de tamaño de chunk / import estático+dinámico de auth-store, no
  errores), `vitest run` ✅ 5/5. El único artefacto de T00 es esta entrada.

## Sesión 2026-07-21 — F01-B: prorrateo secundario, el frontend habla PARES EXPLÍCITOS

**Contexto.** F01-A (backend) reemplazó el array posicional del prorrateo secundario por
pares explícitos con el id del centro destino. Esta tarea hace que el frontend hable ese
mismo contrato. Antes de escribir nada se leyó el contrato real del backend
(`src/shared/schemas/cost.schema.ts`) y su `DECISIONES.md` (estrategia de retrocompatibilidad).

**Contrato espejado exacto.** Cada entrada del reparto secundario ahora lleva
`distributions: { centroDestinoId: string, fijo: number, variable: number }[]` (mismos nombres
de campo que el backend). Se sacaron del tipo los Records posicionales `toProductive` /
`toProductiveFixed` / `toProductiveVariable`.

**Decisión de diseño — traducir en el BORDE, no reescribir la UI.** El estado interno del
formulario sigue editando por CENTRO (Records keyed by id): así la tabla, el salteo de la
columna del propio centro y los `register` por `c.id` no cambian (eran correctos: ya eran por
id, no por posición). Lo único que cambia es qué viaja en el payload:
- Al **guardar** (`cleanIndirectCostsForSubmit`): los Records por id se convierten a
  `distributions` con `centroDestinoId`. Se descarta por seguridad el propio centro (auto-reparto)
  y los pares en cero. En modo 'base' se mandan las unidades como `fijo = variable` con su id.
- Al **cargar** (`cleanIndirectCostsForForm`): se leen los `distributions` que entrega el backend
  (que ya normaliza en `GET`, aun para estructuras guardadas antes del cambio) y se vuelcan a los
  Records por id. Leer por id —no por posición— es lo que evita mostrar los % contra el centro
  equivocado al abrir una estructura vieja.
- Se introdujo un tipo de estado de formulario propio (`IndirectCostsFormValues`) separado del
  tipo de cable (`IndirectCostConfig`), para que el `useForm` y los `register` sigan tipando los
  Records mientras el contrato externo queda en pares.

**Retrocompatibilidad (parámetro #4).** El backend eligió un adaptador de LECTURA: su `GET`
devuelve SIEMPRE `distributions`, así que el frontend nunca ve la forma vieja y no necesita su
propio adaptador. Si una config legada es ambigua (el propio centro como destino, o un centro
inexistente), el backend responde 422 al calcular; el frontend ya surfacea ese mensaje tal cual
(`apiErrorMessage` → `setError`), en español y con el NOMBRE humano del centro, sin exponer ids
ni endpoints (parámetros #5 y #6). No hubo que tocar el manejo de errores.

**Fuera de alcance (F02/F03, se respetó).** No se tocó el reordenar/borrar filas ni el bloqueo
de la columna de un servicio ya cerrado en el escalonado. Solo cambió lo que viaja en el payload.

**Vista de centro (`CostCentersView`).** El detalle de un centro de servicio ahora lista
`distributions` mostrando el nombre humano del destino (fallback al id solo si faltara el nombre).

**Verificación.** `npm run typecheck` ✅, `npm run build` ✅ (solo avisos preexistentes de tamaño
de chunk / import de auth-store), `vitest run` ✅ 11/11 (6 nuevos en
`prorrateo-secundario-pares.test.ts`: el submit manda `centroDestinoId`/`fijo`/`variable`, nunca
el propio centro ni pares vacíos; el orden de las claves no cambia a qué centro va cada valor;
modo base manda unidades como fijo=variable; load lee por id; round-trip estable). El seam de
integración está cubierto por construcción: la forma que produce el submit del frontend es
EXACTAMENTE la que el test de regresión de F01-A valida contra el schema Zod y el motor reales
del backend (2 productivos + 2 servicios cierran en 0, reordenar da idéntico, un solo servicio
anda). No se corrió un click-through en el navegador porque exige levantar Docker+DB+auth+seed
(el daemon de Docker está apagado) y staging todavía no tiene F01-A; los pasos para la
confirmación visual quedan en el resumen para Alan.

## Sesión 2026-07-21 — F05: pantalla de imputación (resolver datos sin imputar)

**Contexto.** F04 (backend, ya en `dev`) marca un cálculo como incompleto cuando corrió con
datos sin decisión de imputación de período, y bloquea el CIERRE del mes con un 422 accionable —
pero no había ninguna pantalla para RESOLVER una imputación, así que el costista chocaba una
pared sin acción posible. Esta tarea construye ese camino. Contrato del backend verificado antes
de escribir (`src/application/cost-structures/calculation-run-service.ts`, `cost-period-service.ts`,
`domain/errors/*`): `data.incompleto` = `{ incompleto, motivos, datosPendientes:[{id,nombre}] }`
(mismo objeto en `results.incompletitud`); el cierre lanza `MissingInputError('periodoImputado', …)`
→ 422 `{ error:{ code:'MISSING_INPUT', message:<español>, details:{ field:'periodoImputado' } } }`.

**Reuso, no reconstrucción (parámetro del prompt).** Se reusaron sin tocar `ImputacionModal`,
`proposeImputation` (imputacion.ts) y `useImputar` (trazabilidad-hooks). Lo nuevo se concentró en
un solo componente, `ImputacionResolver.tsx` (`IncompleteNotice` + `DatoImputacionModal`).

**Las dos opciones del modal salen del manual, no del parafraseo del prompt.** El prompt describió
las opciones como "Imputar a &lt;período del hecho&gt; (devengado)" vs "Mover a &lt;período
actual&gt;", que está invertido respecto del `Manual-Trazabilidad-DEVS-v1.md §3` (fuente de dominio
autorizada, hallada en `C:\Users\Alan\Desktop\` — ver nota de vault abajo). El manual define
textualmente `Imputar a ${periodoCosto} (devengado)` (recomendada) vs `Mover a la estructura ${p}`,
que es EXACTAMENTE lo que ya implementa y testea `proposeImputation`. Regla #4 (no inventar reglas
de dominio) → se siguió el manual y el código existente; no se reescribieron los labels. Queda
anotado por si la cátedra confirma que el parafraseo era el correcto.

**De dónde sale la fecha del hecho.** `datosPendientes` solo trae `{id, nombre}`. Para armar las
dos opciones (que dependen del mes del hecho vs el período de costo) se pide la ficha del dato con
`useDataPointTrace(id)` y se usa `periods.hecho` (`fecha_hecho` en 'YYYY-MM-DD', o null). Si un
dato no tuviera `fecha_hecho`, se ofrece igual "Imputar a &lt;período de costo&gt;" — nunca se deja
al costista sin acción (parámetro NO DEAD ENDS).

**`periodoCosto` = `structure.period`.** Se pasa el período de costo de la estructura (igual que
`RawMaterialForm` y `DerivationTree`), no el `code` del período seleccionado en la barra. Es lo
consistente con el resto del módulo y con la regla del manual; documentado por si en multi-período
se quisiera afinar.

**El aviso va ARRIBA de los números.** En la pestaña Resultado, `IncompleteNotice` se renderiza
antes de `DerivationTree` y `ResultPanel` cuando `incompletitud.incompleto` es true (rojo, con
`role="alert"`, lista los datos por NOMBRE). Cada dato es un botón que abre el modal; al resolver,
se saca de la lista (optimista) y, cuando no queda ninguno, aparece "Volver a calcular" que corre
el cálculo limpio y hace desaparecer el aviso.

**La marca vive en estado de página, no en query.** `incompletitud` se guarda desde la respuesta de
`useCalculateTraced` (se extendió su tipo con `incompleto`). Consecuencia asumida: el aviso aparece
DESPUÉS de calcular en esta sesión; abrir Resultado con un resultado cacheado (sin recalcular) no lo
muestra hasta recalcular, porque no hay endpoint que devuelva `results.incompletitud` de una corrida
vieja sin volver a correr el motor (correr el motor en cada vista de pestaña spamearía corridas y
audit logs). No es un dead end: el CIERRE del período sigue bloqueando y ofreciendo la resolución.

**Cierre del período (mismo camino de resolución).** `PeriodBar` ahora cierra con `runClose`: si el
backend responde el 422 de `periodoImputado`, muestra el mensaje en español del backend TAL CUAL y,
debajo, la misma resolución in-situ (`IncompleteNotice`) con las opciones — al terminar ofrece
"Cerrar &lt;mes&gt;" que reintenta el cierre. La lista de datos se toma, en orden de preferencia, de
`error.details.datosPendientes` (si el backend algún día la adjunta — hoy no la manda) y si no, de
la última corrida (`pendingDatos`, que baja de la página). Si tampoco hay lista a mano (nunca se
calculó en la sesión), un botón "Resolver los datos pendientes" lleva a la pestaña Resultado y
recalcula para poblar el aviso. Nunca se muestra el 422 crudo ni ids (parámetros #5/#6).

**Nota de vault (parámetro #4).** El vault NO está en la ruta documentada del prompt
(`001 - Costear/001.3 - …`). Sí se encontraron en disco `C:\Users\Alan\Desktop\Manual-Trazabilidad-DEVS-v1.md`
y una copia de `Test-Temporalidad-2-Periodos.md` en un output de AppData; el §3 del manual fue la
fuente para las opciones de imputación (arriba). No se consultó Graphify.

**Verificación.** `npm run typecheck` ✅, `npm run build` ✅ (mismos avisos preexistentes de tamaño
de chunk), `vitest run` ✅ 14/14 (3 nuevos en `imputacion-error.test.ts`: reconocer el 422 de
`periodoImputado` por `code`+`field` sin parsear texto; no confundirlo con otros `MISSING_INPUT` ni
otros códigos; extraer `datosPendientes` del error si viniera, o null si no). NO se corrió el
click-through en el navegador: exige Docker+Postgres(:5433)+backend+seed y el daemon de Docker está
apagado / el puerto 5433 no escucha; mutar el backend de `dev` compartido (crear/cerrar períodos)
sería una acción sobre datos compartidos que no corresponde hacer sin pedirlo. Los pasos para la
confirmación visual local quedan en el resumen para Alan.
