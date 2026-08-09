import React, { useState } from 'react';
import { Menu, Globe, User, Key, LogOut, ChevronDown, ShoppingCart, Home } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../store';
import { LanguageDropdown } from '../LanguageDropdown';

export interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
  currentUser?: any;
  onOpenChangePassword?: () => void;
  onOpenUserProfile?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onOpenMobileMenu,
  currentUser: propUser,
  onOpenChangePassword,
  onOpenUserProfile,
}) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';
  const navigate = useNavigate();
  const { storeSettings, logout, currentUser: storeUser } = useStore();
  const savedUserStr = localStorage.getItem('kidskart_user');
  const currentUser = propUser || storeUser || (savedUserStr ? (() => { try { return JSON.parse(savedUserStr); } catch { return null; } })() : null) || { name: 'Admin User', role: 3 };
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  return (
    <header className="w-full relative z-50 bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs rounded-[2.5rem] px-4 sm:px-6 py-3 font-arabic mb-6 shrink-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand Logo & Mobile Menu Toggle Button */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <Link to="/" title={storeSettings?.store_name || "Galo Kids"} className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <img 
              src={storeSettings?.store_logo || "/assets/galo-logo.png"} 
              alt={storeSettings?.store_name || "Galo Kids"} 
              className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-105" 
            />
            <div className="flex flex-col">
              <span className="font-black text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                {storeSettings?.store_name || 'Galo Kids'}
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-full bg-slate-900 text-white shadow-2xs">
                  {L("Admin Panel")}
                </span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">
                {language === 'ku' ? 'تەختەی بەڕێوەبەرایەتی' : language === 'ar' ? 'لوحة التحكم الإدارية' : 'Management Dashboard'}
              </span>
            </div>
          </Link>

          {/* Mobile Dark Hamburger Menu Toggle Button */}
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2.5 rounded-2xl bg-slate-900 text-white shadow-md transition-transform active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-indigo-400" />
          </button>
        </div>

        {/* Right: Integrated Control Widgets */}
        <div className="flex flex-wrap items-center gap-2 py-1 w-full md:w-auto shrink-0 justify-start md:justify-end relative z-10">

          {/* Quick POS Terminal Switcher Button */}
          <button
            onClick={() => navigate('/pos')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
            <span>{L("POS Terminal")}</span>
          </button>

          {/* Home Link */}
          <Link
            to="/"
            className="p-2 bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200/80 text-slate-700 rounded-2xl transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </Link>

          {/* Language Dropdown */}
          <LanguageDropdown />

          {/* User Profile Capsule Dropdown */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                  {(currentUser.name || currentUser.username || 'A').charAt(0).toUpperCase()}
                </div>
                <span className="truncate max-w-[110px] hidden sm:inline">{currentUser.name || currentUser.username || L('Admin')}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu with Proper RTL Alignment & High Z-Index */}
              {isUserDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserDropdownOpen(false)} 
                  />
                  <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-56 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-2xl p-2.5 z-[99999] animate-in fade-in zoom-in-95 duration-100 space-y-1 font-arabic`}>
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                      <p className="text-xs font-black text-slate-900 truncate">{currentUser.name || currentUser.username || 'Admin User'}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate">{currentUser.email || 'admin@galokids.com'}</p>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        if (onOpenUserProfile) onOpenUserProfile();
                        else navigate('/profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>{L("User Profile")}</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        if (onOpenChangePassword) onOpenChangePassword();
                        else navigate('/profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-amber-600" />
                      <span>{L("Change Password")}</span>
                    </button>

                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>{L("Logout")}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
