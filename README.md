# CosteAR — Frontend

SPA para profesionales de costos. Interfaz de precisión, minimalista, con el
granate como firma de marca (según la guía "Identidad Visual v1.0").

## Stack

- **React 19 + TypeScript** (strict)
- **Vite 6** — build y dev server
- **TanStack Router** — ruteo type-safe con guardia de auth
- **TanStack Query** — data fetching y cache
- **Zustand** — estado de sesión (access token en memoria, no localStorage)
- **Tailwind CSS v4** — design system con los tokens de la identidad visual
- **React Hook Form** — formularios
- **Axios** — cliente HTTP con refresh transparente del token

## Setup

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api → backend :3000)
```

Requiere el backend corriendo en `http://localhost:3000`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Build de producción |
| `npm run typecheck` | Chequeo de tipos |
| `npm run preview` | Sirve el build |

## Diseño

Sistema en `src/index.css` (`@theme`), derivado de la identidad visual:

- **Marca**: granate `#6E1423` (navegación, firma), rojo acción `#C2192A` (CTAs)
- **Tipografía**: Inter (UI) + JetBrains Mono (montos, alineados a la derecha)
- **Estados**: semáforo verde/ámbar/rojo, siempre con texto (accesibilidad)
- **Grilla 8px**, esquinas 4/6/8px, sombras mínimas, mucho blanco

> Regla de oro de la guía: si una pantalla "se ve roja", está mal. El rojo es
> señal de acción/estado, no relleno.

## Estructura

```
src/
├── components/
│   ├── ui/        # Button, Card, Input, StatusBadge, Money (primitivos)
│   └── layout/    # AppShell (sidebar granate + header)
├── features/      # auth, dashboard, companies, cost-structures, alerts, macro, profile
├── lib/           # api (axios + refresh), utils (formato $ARS), types
├── stores/        # auth-store (Zustand)
└── router.tsx     # rutas + guardia de autenticación
```

## Seguridad (lado cliente)

- Access token **en memoria** (Zustand), nunca en localStorage → menor superficie XSS.
- Refresh token en cookie **httpOnly** que el navegador adjunta solo.
- Refresh **transparente**: un 401 dispara un único intento de refresh y reintenta.
- Las peticiones concurrentes comparten la misma promesa de refresh.
