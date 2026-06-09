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
import { EmpresaPortalPage } from '@/features/empresa-portal/EmpresaPortalPage';
import { PropagacionPage } from '@/features/propagacion/PropagacionPage';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';
import { AutomatizacionPage } from '@/features/automatizacion/AutomatizacionPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
});

/** Guardia: redirige a /login si no hay sesión activa. */
function requireAuth() {
  const { accessToken, initializing, user } = useAuthStore.getState();
  if (!accessToken && !initializing) {
    throw redirect({ to: '/login' });
  }
  // Primer login: operador debe cambiar su contraseña
  if (user?.mustChangePassword) {
    throw redirect({ to: '/change-password' });
  }
  // Los operadores de empresa solo tienen acceso al portal
  if (user?.role === 'EMPRESA_OPERATOR') {
    throw redirect({ to: '/portal' });
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken) throw redirect({ to: '/login' });
    if (user?.role === 'EMPRESA_OPERATOR') throw redirect({ to: '/portal' });
    throw redirect({ to: '/dashboard' });
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
const propagacionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/propagacion', beforeLoad: requireAuth, component: PropagacionPage });
const automatizacionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/automatizacion', beforeLoad: requireAuth, component: AutomatizacionPage });
// Cambio de contraseña obligatorio en primer login (operadores invitados)
const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  beforeLoad: () => {
    const { accessToken, initializing } = useAuthStore.getState();
    if (!accessToken && !initializing) throw redirect({ to: '/login' });
  },
  component: ChangePasswordPage,
});

// Portal de empresa — accesible solo con rol EMPRESA_OPERATOR
const empresaPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal',
  beforeLoad: () => {
    const { accessToken, initializing } = useAuthStore.getState();
    if (!accessToken && !initializing) throw redirect({ to: '/login' });
    // No bloquear: el costista que llega acá sería raro pero se lo redirige al dash
  },
  component: EmpresaPortalPage,
});

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
  propagacionRoute,
  automatizacionRoute,
  changePasswordRoute,
  empresaPortalRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
