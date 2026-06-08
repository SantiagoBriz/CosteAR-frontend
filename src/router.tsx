import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CompaniesPage } from '@/features/companies/CompaniesPage';
import { CompanyDetailPage } from '@/features/companies/CompanyDetailPage';
import { CostStructurePage } from '@/features/cost-structures/CostStructurePage';
import { AlertsPage } from '@/features/alerts/AlertsPage';
import { MacroPage } from '@/features/macro/MacroPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { ValidacionesPage } from '@/features/validaciones/ValidacionesPage';
import { HistorialPage } from '@/features/validaciones/HistorialPage';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

/** Guardia: redirige a /login si no hay sesión activa. */
function requireAuth() {
  const { accessToken, initializing } = useAuthStore.getState();
  if (!accessToken && !initializing) {
    throw redirect({ to: '/login' });
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { accessToken } = useAuthStore.getState();
    throw redirect({ to: accessToken ? '/dashboard' : '/login' });
  },
});

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: RegisterPage });
const forgotRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forgot-password', component: ForgotPasswordPage });

const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', beforeLoad: requireAuth, component: DashboardPage });
const companiesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/companies', beforeLoad: requireAuth, component: CompaniesPage });
const companyDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/companies/$id', beforeLoad: requireAuth, component: CompanyDetailPage });
const costStructureRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cost-structures/$id', beforeLoad: requireAuth, component: CostStructurePage });
const alertsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/alerts', beforeLoad: requireAuth, component: AlertsPage });
const macroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/macro', beforeLoad: requireAuth, component: MacroPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', beforeLoad: requireAuth, component: ProfilePage });
const validacionesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/validaciones', beforeLoad: requireAuth, component: ValidacionesPage });
const historialRoute = createRoute({ getParentRoute: () => rootRoute, path: '/historial', beforeLoad: requireAuth, component: HistorialPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotRoute,
  dashboardRoute,
  companiesRoute,
  companyDetailRoute,
  costStructureRoute,
  alertsRoute,
  macroRoute,
  profileRoute,
  validacionesRoute,
  historialRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
