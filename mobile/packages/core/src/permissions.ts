import { Role, User } from './types';

/**
 * What a role may do before anyone has ticked its boxes.
 *
 * These two lists must stay identical to `defaultsFor()` in the backend's
 * User model and to ROLE_PERMISSION_PRESETS on the website. The panel decides
 * which buttons to draw from its copy and the API decides who may press them
 * from the backend's; a third client makes a third chance for them to drift,
 * so it is worth saying plainly that these three must agree.
 */
const CASHIER_DEFAULTS = [
  'pos.access',
  'pos.reports',
  'orders.view',
  'orders.manage',
  'products.view',
  'labels.print',
  'customers.view',
] as const;

const STAFF_DEFAULTS = [
  'products.view',
  'products.manage',
  'inventory.view',
  'inventory.manage',
  'purchases.manage',
  'labels.print',
  'orders.view',
  'orders.manage',
  'customers.view',
] as const;

export const ROLE = {
  CUSTOMER: 0,
  ADMIN: 1,
  CASHIER: 2,
  STAFF: 3,
} as const;

export const isAdmin = (user?: User | null): boolean => user?.role === ROLE.ADMIN;

export const isPrivileged = (user?: User | null): boolean =>
  user != null && (user.role === ROLE.ADMIN || user.role === ROLE.CASHIER || user.role === ROLE.STAFF);

function defaultsFor(role: Role): readonly string[] {
  if (role === ROLE.CASHIER) return CASHIER_DEFAULTS;
  if (role === ROLE.STAFF) return STAFF_DEFAULTS;
  return [];
}

/**
 * Whether this account may do something.
 *
 * The role is checked before the list, exactly as the server does it: back
 * office permissions belong to back office roles, so a customer carrying "*"
 * is still refused. Hiding a button is a courtesy — the server decides.
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!isPrivileged(user)) return false;

  if (Array.isArray(user.permissions)) {
    return (
      user.permissions.includes(permission) ||
      user.permissions.includes('*') ||
      user.permissions.includes('all')
    );
  }

  return defaultsFor(user.role).includes(permission);
}
