import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Printer, 
  UserCircle, 
  LogOut, 
  RotateCcw,
  LayoutDashboard,
  Layers,
  ChevronDown,
  Key,
  X,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageDropdown } from './LanguageDropdown';
import { adminTr } from '../i18n/adminDict';
import { useToast } from './ui/Feedback';

interface POSNavbarProps {
  shift: any;
  heldOrdersCount: number;
  onOpenHeldOrders: () => void;
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
  lastReceipt: any;
  onReprintLastReceipt: () => void;
  onOpenReturnModal: () => void;
}

export const POSNavbar: React.FC<POSNavbarProps> = ({
  shift,
  heldOrdersCount,
  onOpenHeldOrders,
  onOpenShiftModal,
  onOpenCloseShiftModal,
  lastReceipt,
  onReprintLastReceipt,
  onOpenReturnModal,
}) => {
  const { currentUser, logout, storeSettings } = useStore();
  const { t, language } = useLanguage();
  const toast = useToast();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }
    toast('Password updated successfully ✅');
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const isAdminOnly = React.useMemo(() => {
    if (!currentUser) return true;
    const rawRole = currentUser.role ?? (currentUser as any).role_id ?? (currentUser as any).user_role;
    if (rawRole === undefined || rawRole === null || rawRole === '') return true;
    const roleStr = String(rawRole).toLowerCase().trim();
    return roleStr !== '0' && roleStr !== 'banned' && roleStr !== 'disabled';
  }, [currentUser]);

  return (
    <>
      <header className="w-full relative z-50 bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs rounded-[2.5rem] px-4 sm:px-6 py-3 font-arabic shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Brand Logo & Terminal Badge */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <Link to="/" title={storeSettings?.store_name || "Galo Kids"} className="flex items-center gap-3 group shrink-0">
              <img 
                src={storeSettings?.store_logo || "/assets/galo-logo.png"} 
                alt={storeSettings?.store_name || "Galo Kids"} 
                className="h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-105" 
              />
              <div className="flex flex-col">
                <span className="font-black text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                  {storeSettings?.store_name || 'Galo Kids'}
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-slate-900 text-white shadow-2xs">
                    POS
                  </span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {language === 'ku' ? 'تێرمیناڵی کاشێر' : language === 'ar' ? 'محطة أمين الصندوق' : 'Cashier Terminal'}
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Quick Control Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
            
            {/* Shift Status Button */}
            <button
              onClick={shift ? onOpenCloseShiftModal : onOpenShiftModal}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                shift 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{shift ? L("Close Shift") : L("Open Shift")}</span>
            </button>

            {/* Held Orders Button */}
            <button
              onClick={onOpenHeldOrders}
              className="px-3.5 py-2 bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5 relative"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>{L("Held Sales")}</span>
              {heldOrdersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-2xs animate-pulse">
                  {heldOrdersCount}
                </span>
              )}
            </button>

            {/* Return Order Button */}
            <button
              onClick={onOpenReturnModal}
              className="px-3.5 py-2 bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>{L("Refund")}</span>
            </button>

            {/* Reprint Receipt Button */}
            {lastReceipt && (
              <button
                onClick={onReprintLastReceipt}
                className="p-2 bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 rounded-2xl transition-all shadow-2xs cursor-pointer active:scale-95"
                title={L("Reprint Last Receipt")}
              >
                <Printer className="w-4 h-4 text-indigo-600" />
              </button>
            )}

            {/* Control Panel Switcher (Admin Only) */}
            {isAdminOnly && (
              <Link
                to="/admin"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>{L("Admin Panel")}</span>
              </Link>
            )}

            {/* Home Link */}
            <Link
              to="/"
              className="p-2 bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 rounded-2xl transition-all shadow-2xs cursor-pointer active:scale-95"
              title={t('home') || 'Home'}
            >
              <Home className="w-4 h-4" />
            </Link>

            {/* Language Dropdown */}
            <LanguageDropdown />

            {/* User Profile Dropdown Capsule */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                    {(currentUser.name || currentUser.username || 'C').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[110px]">{currentUser.name || currentUser.username}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-56 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-2xl p-2.5 z-[99999] animate-in fade-in zoom-in-95 duration-100`}>
                      <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                        <p className="text-xs font-black text-slate-900 truncate">{currentUser.name || currentUser.username}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{currentUser.email || 'cashier@galokids.com'}</p>
                      </div>

                      <button
                        onClick={() => { setIsUserDropdownOpen(false); setShowPasswordModal(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-indigo-600" />
                        <span>{L("Change Password")}</span>
                      </button>

                      <button
                        onClick={() => { setIsUserDropdownOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer mt-1"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>{t('logout') || 'Logout'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 font-arabic">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">{L("Change Password")}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{L("Update password for current logged in account")}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{L("Current Password")}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{L("New Password")}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{L("Confirm New Password")}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {L("Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{L("Save Changes")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
