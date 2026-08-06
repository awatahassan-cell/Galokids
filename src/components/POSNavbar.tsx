import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  ShieldAlert, 
  Clock, 
  Printer, 
  UserCircle, 
  LogOut, 
  Store,
  Layers,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageDropdown } from './LanguageDropdown';

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
  const isRTL = language === 'ar' || language === 'ku';

  const isStaffOrAdmin = currentUser && (
    currentUser.role === 2 || 
    currentUser.role === 3 || 
    currentUser.role === '2' || 
    currentUser.role === '3' || 
    currentUser.role === 'admin' || 
    currentUser.role === 'staff'
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 py-2.5 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-2 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        
        {/* Left / Brand section & Quick actions on mobile */}
        <div className={`flex items-center justify-between w-full md:w-auto gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <img src={storeSettings?.store_logo || "/assets/galo-logo.png"} alt="Logo" className="h-7 w-auto object-contain bg-white/10 rounded-lg p-1" />
            <div className={`flex flex-col ${isRTL ? 'text-right font-arabic' : 'text-left'}`}>
              <span className="font-black text-xs sm:text-sm tracking-tight text-white flex items-center gap-1">
                {storeSettings?.store_name || 'Galo Kids'} <span className="text-xs">🎈</span>
              </span>
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                POS 
              </span>
            </div>
          </div>

          {/* Cashier Badge */}
          {currentUser && (
            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-[10px] text-slate-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <UserCircle className="w-3 h-3 text-indigo-400" />
              <span className="font-medium truncate max-w-[80px]">{currentUser.name || currentUser.username}</span>
            </div>
          )}

          {/* Mobile-only Quick actions */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageDropdown />
            {currentUser && (
              <button
                onClick={logout}
                className="p-1.5 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 border border-slate-700/70 rounded-lg transition-all active:scale-95"
                title={t('logout') || 'Logout'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center / Action Buttons (دوگمه ئایکۆنییەکان لەگەڵ تولتیپ) */}
        <div className={`flex items-center gap-1.5 sm:gap-2 justify-center w-full md:w-auto py-0.5 scrollbar-none overflow-x-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
          
          {/* Main Home / Store Link */}
          <div className="relative group flex items-center justify-center shrink-0">
            <Link
              to="/"
              title={t('home') || 'Home'}
              className="flex items-center justify-center p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700/70 transition-all shadow-sm active:scale-95"
            >
              <Store className="w-4 h-4 text-emerald-400" />
            </Link>
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all bg-slate-950 text-slate-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50 border border-slate-800">
              {t('home') || 'Home'}
            </div>
          </div>

          {/* Admin Link */}
          {isStaffOrAdmin && (
            <div className="relative group flex items-center justify-center shrink-0">
              <Link
                to="/admin"
                title={t('admin') || 'Admin'}
                className="flex items-center justify-center p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700/70 transition-all shadow-sm active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </Link>
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all bg-slate-950 text-slate-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50 border border-slate-800">
                {t('admin') || 'Admin'}
              </div>
            </div>
          )}

          {/* Shift Button */}
          <div className="relative group flex items-center justify-center shrink-0">
            <button
              onClick={shift ? onOpenCloseShiftModal : onOpenShiftModal}
              title={shift 
                ? (language === 'ku' ? 'زانیاری و داخستنی شیفت' : language === 'ar' ? 'معلومات وإغلاق الوردية' : 'Shift Info & Close') 
                : (language === 'ku' ? 'کردنەوەی شیفت' : language === 'ar' ? 'فتح وردية' : 'Open Shift')}
              className={`relative flex items-center justify-center p-2 rounded-lg transition-all shadow-sm active:scale-95 border ${
                shift 
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800/80' 
                  : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-800/80'
              }`}
            >
              <Clock className={`w-4 h-4 ${shift ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${shift ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all bg-slate-950 text-slate-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50 border border-slate-800">
              {shift 
                ? (language === 'ku' ? 'زانیاری و داخستنی شیفت' : language === 'ar' ? 'معلومات وإغلاق الوردية' : 'Shift Info & Close') 
                : (language === 'ku' ? 'کردنەوەی شیفت' : language === 'ar' ? 'فتح وردية' : 'Open Shift')}
            </div>
          </div>

          {/* Held Orders Button */}
          <div className="relative group flex items-center justify-center shrink-0">
            <button
              onClick={onOpenHeldOrders}
              title={`${t('heldOrders') || 'Held Orders'} (${heldOrdersCount})`}
              className="relative flex items-center justify-center p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-all shadow-sm active:scale-95"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              {heldOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse border border-slate-900">
                  {heldOrdersCount}
                </span>
              )}
            </button>
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all bg-slate-950 text-slate-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50 border border-slate-800">
              {t('heldOrders') || 'Held Orders'} ({heldOrdersCount})
            </div>
          </div>

          {/* Reprint Last Receipt */}
          {lastReceipt && (
            <div className="relative group flex items-center justify-center shrink-0">
              <button
                onClick={onReprintLastReceipt}
                title={t('reprintReceipt') || 'Reprint Last Receipt'}
                className="flex items-center justify-center p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/70 rounded-lg transition-all shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4 text-sky-400" />
              </button>
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all bg-slate-950 text-slate-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50 border border-slate-800">
                {t('reprintReceipt') || 'Reprint Last Receipt'}
              </div>
            </div>
          )}

          {/* Return / Refund Modal Trigger */}
          <div className="relative group flex items-center justify-center shrink-0">
            <button
              onClick={onOpenReturnModal}
              title={t('returnRefund') || 'Return / Refund'}
              className="flex items-center justify-center p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg transition-all shadow-sm active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
            </button>
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all bg-slate-950 text-slate-100 text-[10px] font-bold py-1 px-2 rounded shadow-xl whitespace-nowrap z-50 border border-slate-800">
              {t('returnRefund') || 'Return / Refund'}
            </div>
          </div>
        </div>

        {/* Right / Language & User actions for Desktop */}
        <div className={`hidden md:flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <LanguageDropdown />

          {currentUser && (
            <button
              onClick={logout}
              className="p-1.5 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 border border-slate-700/70 rounded-xl transition-all active:scale-95"
              title={t('logout') || 'Logout'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
