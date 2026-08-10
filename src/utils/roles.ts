export interface RoleInfo {
  id: 0 | 1 | 2;
  code: 'admin' | 'cashier' | 'customer';
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

  // 2 = Cashier / Staff (کاشێر)
  if (roleStr === '2' || roleStr === 'cashier' || roleStr === 'staff') {
    return {
      id: 2,
      code: 'cashier',
      label: language === 'ku' ? 'کاشێر' : language === 'ar' ? 'أمينات صندوق' : 'Cashier',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
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

export const isAdminRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '1' || s === 'admin' || s === 'owner' || s === 'manager';
};

export const isCashierRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '2' || s === 'cashier' || s === 'staff';
};

export const isCustomerRole = (roleInput: any): boolean => {
  if (roleInput === undefined || roleInput === null) return false;
  const s = String(roleInput).toLowerCase().trim();
  return s === '0' || s === 'customer';
};
