import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Edit, Trash2, Phone, Mail, 
  Calendar, ShoppingBag, ShieldCheck, UserCheck, MessageSquare, 
  X, Save, AlertCircle, CheckCircle2, DollarSign, Tag, RefreshCw,
  KeyRound, CheckSquare, Square, Lock, Sparkles, Store, Boxes, TrendingUp, Settings, Package, FileText
} from 'lucide-react';
import { User, Order } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { getRoleInfo, isStaffOrAdminRole, isCustomerRole, isAdminRole, isCashierRole } from '../../utils/roles';
import { 
  ALL_PERMISSIONS, 
  PERMISSION_CATEGORIES, 
  ROLE_PERMISSION_PRESETS,
  hasPermission,
  PermissionDefinition
} from '../../utils/permissions';
import { formatIQDLabel } from '../../utils/currency';
import { BulkActionBar } from './BulkActionBar';
import { BulkCheckbox } from './BulkCheckbox';
import { useBulkSelection } from './useBulkSelection';

export interface AdminUsersTabProps {
  users: User[];
  orders: Order[];
  currentUser: User | null;
  addUser: (userData: any) => Promise<any> | void;
  updateUser: (userOrId: User | string | number, userData?: any) => Promise<any> | void;
  deleteUser: (id: string) => Promise<any> | void;
  bulkDelete: (type: 'users', ids: string[]) => Promise<{ success: boolean; deleted?: number; message?: string }>;
  confirmDialog: (options: any) => Promise<boolean>;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  orders,
  currentUser,
  addUser,
  updateUser,
  deleteUser,
  bulkDelete,
  confirmDialog,
  toast,
}) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);

  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'customers'>('staff');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<number>(1);
  const [formPassword, setFormPassword] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canBulkDelete = !!currentUser && isAdminRole(currentUser.role);

  // Split Users into Staff & Customers
  const staffUsers = useMemo(() => {
    return users.filter(u => isStaffOrAdminRole(u.role));
  }, [users]);

  const customerUsers = useMemo(() => {
    return users.filter(u => isCustomerRole(u.role));
  }, [users]);

  // Filter based on active sub tab & search query
  const filteredUsers = useMemo(() => {
    const list = activeSubTab === 'staff' ? staffUsers : customerUsers;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(u => 
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.phone && u.phone.includes(term))
    );
  }, [activeSubTab, staffUsers, customerUsers, searchTerm]);

  // Bulk Selection
  const userSelection = useBulkSelection(
    useMemo(() => filteredUsers.map(u => u.id).filter(Boolean) as string[], [filteredUsers])
  );

  // Compute order statistics per customer
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, { orderCount: number; totalSpent: number }>();
    
    orders.forEach(order => {
      const phone = String(order.customerPhone || '').replace(/\D/g, '');
      const userId = String(order.userId || '');
      
      const key = userId || phone;
      if (!key) return;

      const current = map.get(key) || { orderCount: 0, totalSpent: 0 };
      current.orderCount += 1;
      current.totalSpent += Number(order.totalAmount || 0);
      map.set(key, current);

      if (phone && phone !== key) {
        const phoneCurrent = map.get(phone) || { orderCount: 0, totalSpent: 0 };
        phoneCurrent.orderCount += 1;
        phoneCurrent.totalSpent += Number(order.totalAmount || 0);
        map.set(phone, phoneCurrent);
      }
    });

    return map;
  }, [orders]);

  const getCustomerStats = (user: User) => {
    const phone = String(user.phone || '').replace(/\D/g, '');
    const userId = String(user.id || '');
    return customerStatsMap.get(userId) || (phone ? customerStatsMap.get(phone) : null) || { orderCount: 0, totalSpent: 0 };
  };

  const handleOpenAddModal = (defaultRoleType: 'staff' | 'customer') => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    // "Add staff" opens on Staff (3), not Admin (1).
    //
    // It opened on Admin with every box already ticked, so filling in a name
    // and a password and pressing save — which is the whole of the form —
    // created a second full administrator of the shop. Nothing on screen said
    // so unless you happened to read the role dropdown.
    const initialRole: number = defaultRoleType === 'staff' ? 3 : 0;
    setFormRole(initialRole);
    setFormPassword('');
    setFormPermissions(initialRole === 1 ? ROLE_PERMISSION_PRESETS.admin : initialRole === 2 ? ROLE_PERMISSION_PRESETS.cashier : initialRole === 3 ? ROLE_PERMISSION_PRESETS.warehouse : []);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email && !user.email.includes('@phone.user') ? user.email : '');
    setFormPhone(user.phone || '');
    const rInfo = getRoleInfo(user.role);
    setFormRole(rInfo.id);
    setFormPassword('');

    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      setFormPermissions(user.permissions);
    } else if (rInfo.id === 1) {
      setFormPermissions(ROLE_PERMISSION_PRESETS.admin);
    } else if (rInfo.id === 2) {
      setFormPermissions(ROLE_PERMISSION_PRESETS.cashier);
    } else if (rInfo.id === 3) {
      setFormPermissions(ROLE_PERMISSION_PRESETS.warehouse);
    } else {
      setFormPermissions([]);
    }
  };

  const handleRoleChange = (newRole: number) => {
    setFormRole(newRole);
    if (newRole === 1) {
      setFormPermissions(ROLE_PERMISSION_PRESETS.admin);
    } else if (newRole === 2) {
      setFormPermissions(ROLE_PERMISSION_PRESETS.cashier);
    } else if (newRole === 3) {
      setFormPermissions(ROLE_PERMISSION_PRESETS.warehouse);
    } else {
      setFormPermissions([]);
    }
  };

  const togglePermission = (permId: string) => {
    setFormPermissions(prev => {
      if (prev.includes(permId)) {
        return prev.filter(p => p !== permId);
      } else {
        return [...prev, permId];
      }
    });
  };

  const applyPreset = (presetKey: keyof typeof ROLE_PERMISSION_PRESETS) => {
    setFormPermissions(ROLE_PERMISSION_PRESETS[presetKey]);
    toast(language === 'ku' ? 'قاڵبی پێرمیشن دیاریکرا ⚡' : 'Permission preset applied ⚡');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast(language === 'ku' ? 'تکایە ناوی بەکارهێنەر بنووسە' : 'Please enter name', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: any = {
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          role: formRole,
          permissions: formRole === 0 ? [] : formPermissions,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }
        await updateUser(editingUser.id, payload);
        toast(language === 'ku' ? 'زانیاری و پێرمیشنەکان بە سەرکەوتوویی نوێکرانەوە ✅' : 'User and permissions updated successfully ✅');
        setEditingUser(null);
      } else {
        const payload: any = {
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          role: formRole,
          password: formPassword.trim() || undefined,
          permissions: formRole === 0 ? [] : formPermissions,
        };
        await addUser(payload);
        toast(language === 'ku' ? 'بەکارهێنەری نوێ دروستکرا ✅' : 'User created successfully ✅');
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPermissionCountLabel = (user: User) => {
    if (isAdminRole(user.role)) {
      return { label: language === 'ku' ? 'دەسەڵاتی تەواو' : 'Full Access', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
    const count = Array.isArray(user.permissions) ? user.permissions.length : (isCashierRole(user.role) ? ROLE_PERMISSION_PRESETS.cashier.length : ROLE_PERMISSION_PRESETS.warehouse.length);
    return { 
      label: language === 'ku' ? `${count} دەسەڵات` : `${count} perms`, 
      color: count > 10 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-purple-100 text-purple-800 border-purple-200' 
    };
  };

  return (
    <div className="space-y-6 font-arabic animate-fadeIn">
      {/* Header & Sub-Tabs Switcher */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-indigo-600" />
              <span>{language === 'ku' ? 'بەڕێوەبردنی ستاف، دەسەڵاتەکان و کڕیاران' : language === 'ar' ? 'إدارة الموظفين، الصلاحيات والزبائن' : 'Staff, Permissions & Customers'}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {language === 'ku' 
                ? 'کۆنترۆڵکردنی پێرمیشنەکانی کارمەندان، کاشێرەکان و جیاکردنەوەیان لە کڕیارانی تۆمارکراو' 
                : 'Granular permissions control for staff and cashiers, separate from registered customers'}
            </p>
          </div>

          {/* Action Add Button */}
          <button
            type="button"
            onClick={() => handleOpenAddModal(activeSubTab === 'staff' ? 'staff' : 'customer')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black transition-all flex items-center gap-2 shadow-md text-xs cursor-pointer active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {activeSubTab === 'staff'
                ? (language === 'ku' ? 'زیادکردنی ستاف / کارمەند' : language === 'ar' ? 'إضافة موظف جديد' : 'Add Staff Member')
                : (language === 'ku' ? 'زیادکردنی کڕیاری نوێ' : language === 'ar' ? 'إضافة زبون جديد' : 'Add New Customer')}
            </span>
          </button>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5">
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setActiveSubTab('staff'); setSearchTerm(''); }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'staff'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>{language === 'ku' ? 'ستاف و بەڕێوەبەران' : language === 'ar' ? 'الموظفون والإدارة' : 'Staff & Admins'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                activeSubTab === 'staff' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {staffUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSubTab('customers'); setSearchTerm(''); }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'customers'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>{language === 'ku' ? 'کڕیارانی تۆمارکراو' : language === 'ar' ? 'الزبائن المسجلون' : 'Registered Customers'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                activeSubTab === 'customers' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {customerUsers.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-3.5 rtl:left-auto left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ku' ? 'گەڕان بەپێی ناو، مۆبایل، ئیمەیڵ...' : 'Search by name, phone, email...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-9 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[2.5rem] p-6 shadow-sm overflow-hidden">
        {/* Bulk Action Bar */}
        <BulkActionBar
          count={userSelection.count}
          totalVisible={userSelection.totalVisible}
          onSelectAllVisible={userSelection.selectAllVisible}
          onClear={userSelection.clear}
          onDelete={async () => {
            const res = await bulkDelete('users', userSelection.ids);
            if (res.success) userSelection.clear();
            return res;
          }}
          noun={{ ku: 'بەکارهێنەر', ar: 'مستخدم', en: 'users', enOne: 'user' }}
          isAdmin={canBulkDelete}
        />

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3.5 w-10 text-center">
                  <BulkCheckbox
                    checked={userSelection.allVisibleSelected}
                    indeterminate={userSelection.count > 0 && !userSelection.allVisibleSelected}
                    onChange={userSelection.toggleAllVisible}
                    label={L("Select all")}
                  />
                </th>
                <th className="px-4 py-3.5 text-right rtl:text-right ltr:text-left">{L("Name")}</th>
                <th className="px-4 py-3.5 text-right rtl:text-right ltr:text-left">{language === 'ku' ? 'مۆبایل / پەیوەندی' : 'Phone'}</th>
                {activeSubTab === 'staff' ? (
                  <>
                    <th className="px-4 py-3.5 text-right rtl:text-right ltr:text-left">{L("Email")}</th>
                    <th className="px-4 py-3.5 text-center">{L("Role")}</th>
                    <th className="px-4 py-3.5 text-center">{language === 'ku' ? 'دەسەڵاتەکان (Permissions)' : 'Permissions'}</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3.5 text-center">{language === 'ku' ? 'ژمارەی داواکاری' : 'Orders'}</th>
                    <th className="px-4 py-3.5 text-right rtl:text-right ltr:text-left">{language === 'ku' ? 'کۆی کڕین' : 'Total Spent'}</th>
                  </>
                )}
                <th className="px-4 py-3.5 text-right rtl:text-right ltr:text-left">{L("Joined")}</th>
                <th className="px-4 py-3.5 text-center">{L("Actions")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300 stroke-1" />
                      <p>{language === 'ku' ? 'هیچ بەکارهێنەرێک نەدۆزرایەوە.' : 'No users found.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const roleInfo = getRoleInfo(user.role, language);
                  const isSelected = user.id && userSelection.isSelected(user.id);
                  const stats = activeSubTab === 'customers' ? getCustomerStats(user) : null;
                  const isSelf = currentUser && String(user.id) === String(currentUser.id);
                  const permInfo = activeSubTab === 'staff' ? getPermissionCountLabel(user) : null;

                  return (
                    <tr 
                      key={user.id || index}
                      className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        {user.id && (
                          <BulkCheckbox
                            checked={userSelection.isSelected(user.id)}
                            onChange={() => userSelection.toggle(user.id!)}
                            label={user.name}
                          />
                        )}
                      </td>

                      {/* Name & Avatar */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs ${
                            activeSubTab === 'staff' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
                                  {language === 'ku' ? 'تۆ' : 'You'}
                                </span>
                              )}
                            </p>
                            {user.address && (
                              <p className="text-[10.5px] text-slate-400 font-normal truncate max-w-xs">{user.address}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-700 dir-ltr text-right rtl:text-right">
                        {user.phone ? (
                          <a 
                            href={`tel:${user.phone}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-bold"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Staff Columns: Email, Role, Permissions */}
                      {activeSubTab === 'staff' ? (
                        <>
                          <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                            {user.email && !user.email.includes('@phone.user') ? (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{user.email}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 inline-flex text-[11px] font-black rounded-full border ${roleInfo.badgeClass}`}>
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className={`px-3 py-1 inline-flex items-center gap-1.5 text-[11px] font-black rounded-full border transition-transform hover:scale-105 cursor-pointer ${permInfo?.color}`}
                              title={language === 'ku' ? 'کلیک بکە بۆ دەستکاریکردنی دەسەڵاتەکان' : 'Click to edit permissions'}
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>{permInfo?.label}</span>
                            </button>
                          </td>
                        </>
                      ) : (
                        /* Customer Columns: Orders Count & Total Spent */
                        <>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-black font-mono text-xs">
                              {stats?.orderCount || 0}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap font-bold font-mono text-emerald-700">
                            {formatIQDLabel(stats?.totalSpent || 0)}
                          </td>
                        </>
                      )}

                      {/* Join Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-400 text-[11px] font-medium">
                        {user.joinDate || '-'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick WhatsApp chat for customers */}
                          {user.phone && (
                            <a
                              href={`https://wa.me/${user.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                              title={language === 'ku' ? 'چات لە وەتسەپ' : 'WhatsApp Chat'}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}

                          {user.id && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                              title={L("Edit User")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {user.id && !isSelf && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (await confirmDialog({
                                  title: L('Delete user?'),
                                  message: language === 'ku' 
                                    ? `بەکارهێنەر “${user.name}” بە تەواوی دەسڕدرێتەوە.` 
                                    : `“${user.name}” will be permanently deleted.`,
                                  confirmText: L('Delete'),
                                  cancelText: L('Cancel'),
                                  danger: true,
                                })) {
                                  await deleteUser(user.id);
                                  toast(language === 'ku' ? 'بەکارهێنەر سڕدرایەوە ✅' : 'User deleted ✅');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                              title={L("Delete User")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal with Granular Permissions UI */}
      {(isAddModalOpen || editingUser) && (
        <div 
          onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto font-arabic animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-auto animate-scaleUp max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                  {editingUser ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {editingUser 
                      ? (language === 'ku' ? 'دەستکاریکردنی هەژمار و دەسەڵاتەکان' : 'Edit User & Permissions') 
                      : (formRole === 0 
                          ? (language === 'ku' ? 'زیادکردنی کڕیاری نوێ' : 'Add New Customer') 
                          : (language === 'ku' ? 'زیادکردنی ستاف و دیاریکردنی دەسەڵات' : 'Add Staff Member & Permissions'))}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {editingUser ? `${editingUser.name} (${editingUser.phone || editingUser.email || ''})` : (language === 'ku' ? 'زانیارییەکان و دەسەڵاتی دەستگەیشتن دیاری بکە' : 'Set details and access permissions')}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveUser} className="py-4 overflow-y-auto space-y-5 flex-1 pr-1">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {language === 'ku' ? 'ناوی تەواو' : 'Full Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. احمد محمد"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-slate-50/50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {language === 'ku' ? 'ژمارەی مۆبایل' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="0750XXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    dir="ltr"
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-slate-50/50"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {L("Email")} {formRole === 0 && <span className="text-slate-400 font-normal">({language === 'ku' ? 'ئارەزوومەندانە' : 'optional'})</span>}
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-slate-50/50"
                  />
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {L("Role")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(Number(e.target.value))}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-slate-50/50 cursor-pointer"
                  >
                    <option value={1}>{language === 'ku' ? '👑 بەڕێوەبەر (Admin - هەموو دەسەڵاتەکان)' : 'Admin - Full Access'}</option>
                    <option value={2}>{language === 'ku' ? '💳 کاشێر (Cashier - فرۆشتن و پۆس)' : 'Cashier'}</option>
                    <option value={3}>{language === 'ku' ? '📦 کارمەند (Staff - کۆگا یان داواکاری)' : 'Staff'}</option>
                    <option value={0}>{language === 'ku' ? '🛍️ کڕیار (Customer)' : 'Customer'}</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {editingUser ? (language === 'ku' ? 'تێپەڕەوشەی نوێ (ئارەزوومەندانە)' : 'New Password (Optional)') : L("Password")}
                  </label>
                  <input
                    type="password"
                    minLength={editingUser ? undefined : 6}
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Granular Permissions Section (Only for Staff / Cashier / Admin) */}
              {formRole !== 0 && (
                <div className="pt-3 border-t border-slate-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">
                        {language === 'ku' ? 'دەسەڵات و پێرمیشنەکانی ستاف (Permissions)' : 'Staff Permissions Matrix'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10.5px] font-mono font-bold">
                        {formRole === 1 ? ALL_PERMISSIONS.length : formPermissions.length} / {ALL_PERMISSIONS.length}
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    {formRole !== 1 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => applyPreset('cashier')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          💳 کاشێر
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('warehouse')}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          📦 کۆگا
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('sales_agent')}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          🛍️ فرۆشتن
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormPermissions(ALL_PERMISSIONS.map(p => p.id))}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          ✅ هەمووی
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormPermissions([])}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          ❌ پاککردنەوە
                        </button>
                      </div>
                    )}
                  </div>

                  {formRole === 1 ? (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center gap-3 text-xs text-indigo-950 font-bold">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                      <p>
                        {language === 'ku' 
                          ? 'پلەی بەڕێوەبەر (Admin) بە شێوەی بنەڕەتی دەسەڵاتی تەواوی بەسەر هەموو بەش، فایفۆن و ڕاپۆرتەکاندا هەیە.' 
                          : 'Administrators have full, unrestricted access to all dashboard sections, settings and reports.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {PERMISSION_CATEGORIES.map(category => {
                        const catPermissions = ALL_PERMISSIONS.filter(p => p.category === category.id);
                        if (catPermissions.length === 0) return null;

                        const selectedInCat = catPermissions.filter(p => formPermissions.includes(p.id)).length;
                        const isAllSelected = selectedInCat === catPermissions.length;

                        const toggleCategoryAll = () => {
                          if (isAllSelected) {
                            setFormPermissions(prev => prev.filter(p => !catPermissions.some(cp => cp.id === p)));
                          } else {
                            const newIds = catPermissions.map(cp => cp.id);
                            setFormPermissions(prev => Array.from(new Set([...prev, ...newIds])));
                          }
                        };

                        return (
                          <div key={category.id} className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <span>{language === 'ku' ? category.nameKu : language === 'ar' ? category.nameAr : category.nameEn}</span>
                                <span className="text-[10.5px] font-mono text-slate-400">({selectedInCat}/{catPermissions.length})</span>
                              </span>
                              <button
                                type="button"
                                onClick={toggleCategoryAll}
                                className="text-[10.5px] font-bold text-indigo-600 hover:underline cursor-pointer"
                              >
                                {isAllSelected 
                                  ? (language === 'ku' ? 'لابردنی هەمووی' : 'Deselect All') 
                                  : (language === 'ku' ? 'دیاریکردنی هەمووی' : 'Select All')}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {catPermissions.map(perm => {
                                const isChecked = formPermissions.includes(perm.id);
                                return (
                                  <label
                                    key={perm.id}
                                    onClick={() => togglePermission(perm.id)}
                                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all cursor-pointer select-none ${
                                      isChecked 
                                        ? 'bg-white border-indigo-300 shadow-2xs ring-1 ring-indigo-500/10' 
                                        : 'bg-white/50 border-slate-200 hover:bg-white text-slate-500'
                                    }`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-300" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-black leading-tight ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                                        {language === 'ku' ? perm.labelKu : language === 'ar' ? perm.labelAr : perm.labelEn}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-normal leading-snug mt-0.5 line-clamp-1">
                                        {perm.descriptionKu}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }} 
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {L("Cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? (language === 'ku' ? 'پاشەکەوتکردنی گۆڕانکاری و دەسەڵاتەکان' : 'Save User & Permissions') : (language === 'ku' ? 'تۆمارکردنی ستاف' : 'Create User')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
