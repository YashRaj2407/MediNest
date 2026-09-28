/**
 * MediNest — Clerk Authentication Helper & Configuration
 */

export const CLERK_PUBLISHABLE_KEY =
  (typeof process !== 'undefined' && process.env?.VITE_CLERK_PUBLISHABLE_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY) ||
  'pk_test_bWVkaW5lc3QtZGVtby1jbGVyay1rZXkk';

export interface UserRoleClaims {
  role: 'patient' | 'doctor' | 'admin';
  full_name?: string;
  email?: string;
}

/**
 * Extracts the active role from Clerk user public metadata or defaults to 'patient'
 */
export function getClerkUserRole(user: any): 'patient' | 'doctor' | 'admin' {
  if (!user) return 'patient';
  const role = user.publicMetadata?.role || user.unsafeMetadata?.role;
  if (role === 'doctor' || role === 'admin' || role === 'patient') {
    return role;
  }
  return 'patient';
}

/**
 * Validates whether the active Clerk user matches the requested portal role
 */
export function isUserAuthorizedForRole(user: any, requiredRole: 'patient' | 'doctor' | 'admin'): boolean {
  if (!user) return false;
  const currentRole = getClerkUserRole(user);
  return currentRole === requiredRole;
}
