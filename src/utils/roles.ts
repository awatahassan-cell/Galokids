export interface RoleInfo {
  id: 0 | 1 | 2 | 3;
  code: 'admin' | 'cashier' | 'staff' | 'customer';
  label: string;
  badgeClass: string;
}

export const getRoleInfo = (roleInput: any, language: string = 'ku'): RoleInfo => {
  const roleStr = String(roleInput ?? '0').toLowerCase().trim();

  // 1 = Admin (بەڕێوەبەر)
  if (roleStr === '1' || roleStr === 'admin' || roleStr === 'owner' || roleStr === 'manager') {
    return {
      id: 1,
      code: 'admin',
      label: language === 'ku' ? 'بەڕێوەبەر' : language === 'ar' ? 'مدير' : 'Admin',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
  }

  // 2 = Cashier (کاشێر)
  if (roleStr === '2' || roleStr === 'cashier') {
    return {
      id: 2,
      code: 'cashier',
      label: language === 'ku' ? 'کاشێر' : language === 'ar' ? 'کاشیر' : 'Cashier',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  }

  // 3 = Staff (کارمەند)
  if (roleStr === '3' || roleStr === 'staff' || roleStr === 'employee') {
    return {
      id: 3,
      code: 'staff',
      label: language === 'ku' ? 'کارمەند' : language === 'ar' ? 'موظف' : 'Staff',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
    };
  }

  // 0 = Customer (کڕیار)
  return {
    id: 0,
    code: 'customer',
    label: language === 'ku' ? 'کڕیار' : language === 'ar' ? 'زبون' : 'Customer',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  };
};

/**
 * Canonical role id for anything the UI or the API may hand us
 * ("cashier", "2", 2, undefined). Unknown values fall back to Customer —
 * never to a privileged role.
 */
export const normalizeRole = (roleInput: any): 0 | 1 | 2 | 3 => {
  const s = String(roleInput ?? '').toLowerCase().trim();
  if (s === '1' || s === 'admin' || s === 'owner' || s === 'manager') return 1;
  if (s === '2' || s === 'cashier') return 2;
  if (s === '3' || s === 'staff' || s === 'employee') return 3;
  return 0;
};

export const isAdminRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '1' || s === 'admin' || s === 'owner' || s === 'manager';
};

export const isCashierRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '2' || s === 'cashier';
};

export const isStaffRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '3' || s === 'staff' || s === 'employee';
};

export const isStaffOrAdminRole = (roleInput: any): boolean => {
  return isAdminRole(roleInput) || isCashierRole(roleInput) || isStaffRole(roleInput);
};

export const isCustomerRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '0' || s === 'customer';
};
