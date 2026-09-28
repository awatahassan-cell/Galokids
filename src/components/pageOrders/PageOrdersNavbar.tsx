import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Store, 
  LayoutDashboard, 
  RotateCcw,
  Truck
} from 'lucide-react';
import { useStore } from '../../store';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageDropdown } from '../LanguageDropdown';
import { adminTr } from '../../i18n/adminDict';
import { getRoleInfo } from '../../utils/roles';

interface PageOrdersNavbarProps {
  onClearDraft?: () => void;
}

export const PageOrdersNavbar: React.FC<PageOrdersNavbarProps> = ({ onClearDraft }) => {
  const { currentUser: storeUser, storeSettings } = useStore();
  const savedUserStr = localStorage.getItem('kidskart_user');
  const currentUser = storeUser || (savedUserStr ? (() => { try { return JSON.parse(savedUserStr); } catch { return null; } })() : null) || { name: 'Staff User', role: 3 };
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);

  const isAdminOnly = React.useMemo(() => {
    if (!currentUser) return true;
    const rawRole = currentUser.role ?? (currentUser as any).role_id ?? (currentUser as any).user_role;
    if (rawRole === undefined || rawRole === null || rawRole === '') return true;
    const roleStr = String(rawRole).toLowerCase().trim();
    return roleStr === '1' || roleStr === 'admin';
  }, [currentUser]);

  return (
    <header className="w-full relative z-50 bg-white/90 backdrop-blur-xl border border-white/90 shadow-sm rounded-3xl sm:rounded-[2rem] px-4 sm:px-6 py-2.5 sm:py-3 font-arabic shrink-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <Link to="/" title={storeSettings?.store_name || "Galo Kids"} className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <img 
              src={storeSettings?.store_logo || "/assets/galo-logo.png"} 
              alt={storeSettings?.store_name || "Galo Kids"} 
              className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex flex-col">
              <span className="font-black text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                {storeSettings?.store_name || 'Galo Kids'}
                <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-2xs flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {language === 'ku' ? 'داواکاری پەیجەکان' : language === 'ar' ? 'طلبات الصفحات' : 'Social Orders'}
                </span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">
                {language === 'ku' ? 'تۆمارکردنی فرۆشتن و دلیڤەری پەیجەکان' : language === 'ar' ? 'تسجيل مبيعات التواصل والتوصيل' : 'Manual Delivery & Social Media Sales'}
              </span>
            </div>
          </Link>

          {/* Mobile Quick Switch & Language */}
          <div className="flex items-center gap-1.5 md:hidden">
            <LanguageDropdown />
            <Link
              to="/pos"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-black flex items-center gap-1"
            >
              <Store className="w-3 h-3 text-amber-400" />
              <span>POS</span>
            </Link>
          </div>
        </div>

        {/* Right: Action Navigation Controls */}
        <div className="flex flex-wrap items-center gap-2 py-0.5 w-full md:w-auto shrink-0 justify-start md:justify-end">
          
          {/* Switch to In-Store POS */}
          <Link
            to="/pos"
            className="px-3.5 py-2 rounded-2xl text-[11px] sm:text-xs font-bold bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 border border-slate-200/80 shrink-0"
            title={language === 'ku' ? 'چوون بۆ سیستەمی فرۆشتنی دوکان' : 'Go to in-store POS'}
          >
            <Store className="w-3.5 h-3.5 text-amber-500" />
            <span className="whitespace-nowrap">{language === 'ku' ? 'کاشێری دوکان (POS)' : language === 'ar' ? 'كاشير المحل (POS)' : 'In-Store POS'}</span>
          </Link>

          {/* Switch to Admin Dashboard */}
          {isAdminOnly && (
            <Link
              to="/admin"
              className="px-3.5 py-2 rounded-2xl text-[11px] sm:text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
              <span className="whitespace-nowrap">{L("Admin Panel")}</span>
            </Link>
          )}

          {/* Reset Current Form Draft Button */}
          {onClearDraft && (
            <button
              type="button"
              onClick={onClearDraft}
              className="px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-bold bg-white/80 hover:bg-rose-50 hover:text-rose-600 border border-slate-200/80 text-slate-700 transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              title={language === 'ku' ? 'پاککردنەوەی فۆرم' : 'Clear draft'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span className="whitespace-nowrap hidden sm:inline">{language === 'ku' ? 'نوێکردنەوە' : 'Reset'}</span>
            </button>
          )}

          {/* Home Link */}
          <Link
            to="/"
            className="p-2 bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 rounded-2xl transition-all shadow-2xs active:scale-95 shrink-0 hidden sm:flex"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </Link>

          {/* Language Dropdown */}
          <div className="hidden md:block">
            <LanguageDropdown />
          </div>

          {/* User Profile Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full text-xs font-bold text-slate-800">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-black text-[10px]">
                {(currentUser.name || currentUser.username || 'S').charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[100px] hidden lg:inline">{currentUser.name || currentUser.username}</span>
              <span className="text-[10px] font-black text-rose-600 hidden sm:inline">
                ({getRoleInfo(currentUser.role, language).label})
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
