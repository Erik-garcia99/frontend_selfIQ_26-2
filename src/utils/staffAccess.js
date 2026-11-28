// Matriz de acceso de la app de empleados. La autorización real vive en el
// backend; aquí solo se decide qué se MUESTRA. Lo no permitido se oculta,
// nunca se deja visible y deshabilitado (U-04, SEC-15).
import { canApprove, canCreateBranch, canEditMap, canManage } from './validation.js';

export const APPROVE_ROUTE = 'approve';
export const TOKEN_ROUTE = 'tokens';
export const BRANCH_ROUTE = 'branch';
export const LOGS_ROUTE = 'logs';
export const PEOPLE_ROUTE = 'people';
export const MAP_DRAFT_ROUTE = 'map-draft';
// Rutas de dispositivo abiertas a cualquier empleado. `shelves` es lectura:
// el hub oculta las acciones de edición cuando la cuenta no puede administrar.
export const OPEN_DEVICE_ROUTE = 'test-product-light';
export const OPEN_DEVICE_ROUTES = new Set([OPEN_DEVICE_ROUTE, 'shelves']);

export function canOpenStaffRoute(route, user, deviceRoutes = new Set()) {
  if (route === MAP_DRAFT_ROUTE) return canEditMap(user);
  if (OPEN_DEVICE_ROUTES.has(route)) return true;
  if (route === APPROVE_ROUTE) return canApprove(user);
  if (route === TOKEN_ROUTE || route === LOGS_ROUTE || route === PEOPLE_ROUTE || deviceRoutes.has(route)) return canManage(user);
  if (route === BRANCH_ROUTE) return canCreateBranch(user);
  return true;
}

export function visiblePanelSections(user) {
  return {
    operations: canManage(user),
    mapDraft: canEditMap(user),
    approve: canApprove(user),
    tokens: canManage(user),
    logs: canManage(user),
    people: canManage(user),
    branch: canCreateBranch(user),
  };
}
