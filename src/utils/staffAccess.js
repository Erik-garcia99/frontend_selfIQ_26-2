// Matriz de acceso de la app de empleados. La autorización real vive en el
// backend; aquí solo se decide qué se MUESTRA. Lo no permitido se oculta,
// nunca se deja visible y deshabilitado (U-04, SEC-15).
import { canApprove, canCreateBranch, canManage } from './validation.js';

export const APPROVE_ROUTE = 'approve';
export const TOKEN_ROUTE = 'tokens';
export const BRANCH_ROUTE = 'branch';
export const OPEN_DEVICE_ROUTE = 'test-product-light';

export function canOpenStaffRoute(route, user, deviceRoutes = new Set()) {
  if (route === OPEN_DEVICE_ROUTE) return true;
  if (route === APPROVE_ROUTE) return canApprove(user);
  if (route === TOKEN_ROUTE || deviceRoutes.has(route)) return canManage(user);
  if (route === BRANCH_ROUTE) return canCreateBranch(user);
  return true;
}

export function visiblePanelSections(user) {
  return {
    operations: canManage(user),
    approve: canApprove(user),
    tokens: canManage(user),
    branch: canCreateBranch(user),
  };
}
