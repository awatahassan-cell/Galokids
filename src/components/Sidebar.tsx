import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { Home, ShoppingBag, Info, Mail, UserCircle, Shield, MonitorSmartphone, X, LogIn, Layers, Heart, Package, LogOut, Globe, HelpCircle, Truck, ChevronDown, LayoutGrid, Baby, ToyBrick } from 'lucide-react';
import { Language } from '../i18n/translations';
import { CategoryIcon } from './CategoryIcon';
import { LanguageDropdown } from './LanguageDropdown';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout, categories } = useStore();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const [isProductsExpanded, setIsProductsExpanded] = useState(false);

  const isStaffOrAdmin = currentUser && (
    currentUser.role === 2 || 
    currentUser.role === 3 || 
    currentUser.role === '2' || 
    currentUser.role === '3' || 
    currentUser.role === 'admin' || 
    currentUser.role === 'staff'
  );

  const toggleLanguage = () => {
    const nextLang: Record<Language, Language> = { en: 'ku', ku: 'ar', ar: 'en' };
    setLanguage(nextLang[language]);
  };

  const navItems = [
    { 
      name: t('home'), 
      path: '/', 
      icon: Home, 
      activeBg: 'bg-rose-50/85 text-rose-700 border-rose-100/80 shadow-[0_4px_12px_rgba(244,63,94,0.1)]', 
      hoverBg: 'hover:bg-rose-50/40 hover:text-rose-600', 
      iconBg: 'bg-gradient-to-tr from-rose-400 to-orange-400 text-white shadow-sm shadow-rose-200', 
      iconColor: 'text-rose-500 bg-rose-50' 
    },
    { 
      name: t('products'), 
      path: '/products', 
      icon: ShoppingBag, 
      activeBg: 'bg-sky-50/85 text-sky-700 border-sky-100/80 shadow-[0_4px_12px_rgba(14,165,233,0.1)]', 
      hoverBg: 'hover:bg-sky-50/40 hover:text-sky-600', 
      iconBg: 'bg-gradient-to-tr from-sky-400 to-indigo-500 text-white shadow-sm shadow-sky-200', 
      iconColor: 'text-sky-500 bg-sky-50' 
    },
    { 
      name: t('about'), 
      path: '/about', 
      icon: Info, 
      activeBg: 'bg-emerald-50/85 text-emerald-700 border-emerald-100/80 shadow-[0_4px_12px_rgba(16,185,129,0.1)]', 
      hoverBg: 'hover:bg-emerald-50/40 hover:text-emerald-600', 
      iconBg: 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-200', 
      iconColor: 'text-emerald-500 bg-emerald-50' 
    },
    { 
      name: t('contact'), 
      path: '/contact', 
      icon: Mail, 
      activeBg: 'bg-amber-50/85 text-amber-700 border-amber-100/80 shadow-[0_4px_12px_rgba(245,158,11,0.1)]', 
      hoverBg: 'hover:bg-amber-50/40 hover:text-amber-600', 
      iconBg: 'bg-gradient-to-tr from-amber-400 to-pink-500 text-white shadow-sm shadow-amber-200', 
      iconColor: 'text-amber-500 bg-amber-50' 
    },
  ];

  const supportItems = [
    { 
      name: t('faq'), 
      path: '/faq', 
      icon: HelpCircle, 
      activeBg: 'bg-indigo-50/85 text-indigo-700 border-indigo-100/80 shadow-[0_4px_12px_rgba(99,102,241,0.1)]', 
      hoverBg: 'hover:bg-indigo-50/40 hover:text-indigo-600', 
      iconBg: 'bg-gradient-to-tr from-indigo-400 to-sky-500 text-white shadow-sm shadow-indigo-200', 
      iconColor: 'text-indigo-500 bg-indigo-50' 
    },
    { 
      name: t('shippingReturns'), 
      path: '/shipping-returns', 
      icon: Truck, 
      activeBg: 'bg-emerald-50/85 text-emerald-700 border-emerald-100/80 shadow-[0_4px_12px_rgba(16,185,129,0.1)]', 
      hoverBg: 'hover:bg-emerald-50/40 hover:text-emerald-600', 
      iconBg: 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-200', 
      iconColor: 'text-emerald-500 bg-emerald-50' 
    },
  ];

  const authItems = currentUser ? [
    { 
      name: t('profile'), 
      path: '/profile', 
      icon: UserCircle, 
      activeBg: 'bg-indigo-50/85 text-indigo-700 border-indigo-100/80 shadow-[0_4px_12px_rgba(99,102,241,0.1)]', 
      hoverBg: 'hover:bg-indigo-50/40 hover:text-indigo-600', 
      iconBg: 'bg-gradient-to-tr from-indigo-400 to-purple-500 text-white shadow-sm shadow-indigo-200', 
      iconColor: 'text-indigo-500 bg-indigo-50' 
    },
    { 
      name: t('wishlist'), 
      path: '/wishlist', 
      icon: Heart, 
      activeBg: 'bg-pink-50/85 text-pink-700 border-pink-100/80 shadow-[0_4px_12px_rgba(236,72,153,0.1)]', 
      hoverBg: 'hover:bg-pink-50/40 hover:text-pink-600', 
      iconBg: 'bg-gradient-to-tr from-pink-400 to-rose-500 text-white shadow-sm shadow-pink-200', 
      iconColor: 'text-pink-500 bg-pink-50' 
    },
    { 
      name: t('myOrders'), 
      path: '/my-orders', 
      icon: Package, 
      activeBg: 'bg-violet-50/85 text-violet-700 border-violet-100/80 shadow-[0_4px_12px_rgba(139,92,246,0.1)]', 
      hoverBg: 'hover:bg-violet-50/40 hover:text-violet-600', 
      iconBg: 'bg-gradient-to-tr from-violet-400 to-fuchsia-500 text-white shadow-sm shadow-violet-200', 
      iconColor: 'text-violet-500 bg-violet-50' 
    },
  ] : [
    { 
      name: t('signIn'), 
      path: '/login', 
      icon: LogIn, 
      activeBg: 'bg-teal-50/85 text-teal-700 border-teal-100/80 shadow-[0_4px_12px_rgba(20,184,166,0.1)]', 
      hoverBg: 'hover:bg-teal-50/40 hover:text-teal-600', 
      iconBg: 'bg-gradient-to-tr from-teal-400 to-cyan-500 text-white shadow-sm shadow-teal-200', 
      iconColor: 'text-teal-500 bg-teal-50' 
    },
  ];

  const adminItems = isStaffOrAdmin ? [
    { 
      name: t('pos'), 
      path: '/pos', 
      icon: MonitorSmartphone, 
      activeBg: 'bg-orange-50/85 text-orange-700 border-orange-100/80 shadow-[0_4px_12px_rgba(249,115,22,0.1)]', 
      hoverBg: 'hover:bg-orange-50/40 hover:text-orange-600', 
      iconBg: 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-200', 
      iconColor: 'text-orange-500 bg-orange-50' 
    },
    { 
      name: t('admin'), 
      path: '/admin', 
      icon: Shield, 
      activeBg: 'bg-red-50/85 text-red-700 border-red-100/80 shadow-[0_4px_12px_rgba(239,68,68,0.1)]', 
      hoverBg: 'hover:bg-red-50/40 hover:text-red-600', 
      iconBg: 'bg-gradient-to-tr from-red-400 to-rose-600 text-white shadow-sm shadow-rose-200', 
      iconColor: 'text-red-500 bg-red-50' 
    },
  ] : [];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 ${language === 'ar' || language === 'ku' ? 'right-0' : 'left-0'} w-[290px] bg-white shadow-2xl z-50 transform transition-transform duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${
          isOpen 
            ? 'translate-x-0' 
            : (language === 'ar' || language === 'ku' ? 'translate-x-full' : '-translate-x-full')
        } flex flex-col ${language === 'ar' || language === 'ku' ? 'rounded-l-[2.5rem]' : 'rounded-r-[2.5rem]'} overflow-hidden`}
      >
        {/* Playful Colorful Header */}
        <div className="flex items-center justify-between p-6 border-b border-pink-100 shrink-0 bg-gradient-to-r from-pink-50 via-amber-50 to-sky-50 relative overflow-hidden">
          {/* Decorative bubble backgrounds */}
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-pink-100/40 blur-sm"></div>
          <div className="absolute -bottom-6 right-12 w-12 h-12 rounded-full bg-sky-100/40 blur-sm"></div>
          
          <Link to="/" onClick={onClose} className="flex items-center text-xl font-black font-display text-slate-900 tracking-tight gap-2.5 group relative z-10">
            <div className="bg-gradient-to-tr from-pink-400 via-amber-400 to-sky-400 text-white p-2 rounded-2xl group-hover:scale-110 group-hover:rotate-12 transition-transform shadow-md border-2 border-white animate-bounce-slow">
              <Layers className="w-5 h-5" />
            </div>
            <span className={`bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent font-extrabold tracking-wide drop-shadow-sm ${language === 'ar' || language === 'ku' ? 'font-arabic' : 'font-sans'}`}>
              Galo Kids
            </span>
          </Link>
          <div className="flex items-center gap-2.5 relative z-10">
            {currentUser && (
              <div className="w-8 h-8 bg-gradient-to-tr from-pink-400 via-purple-400 to-sky-400 text-white rounded-xl flex items-center justify-center font-black text-xs border-2 border-white shadow-sm" title={currentUser.name || currentUser.email}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '👤'}
              </div>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:scale-110 rounded-full transition-all border border-slate-100 shadow-sm bg-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>



        {/* Scrolling Nav Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin">
          {/* Menu Section */}
          <div className="space-y-1.5">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <span>🌟</span> {t('explore')}
            </h3>
            {navItems.map((item) => {
              const active = isActive(item.path) && item.path !== '/products';
              const isProducts = item.path === '/products';
              
              return (
                <div key={item.path} className="flex flex-col">
                  <div className="flex items-center">
                    {isProducts ? (
                      <button
                        onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                        className={`group flex-1 flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 border-2 transform active:scale-95 ${
                          active 
                            ? `${item.activeBg} border-transparent` 
                            : `text-slate-600 ${item.hoverBg} border-transparent ${language === 'ar' || language === 'ku' ? 'hover:-translate-x-1.5' : 'hover:translate-x-1.5'}`
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`p-2 rounded-xl transition-all duration-300 ${
                            active 
                              ? `${item.iconBg} scale-110 rotate-6` 
                              : `bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:scale-110 group-hover:-rotate-3`
                          }`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="tracking-wide">{item.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isProductsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`group flex-1 flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 border-2 transform active:scale-95 ${
                          active 
                            ? `${item.activeBg} border-transparent` 
                            : `text-slate-600 ${item.hoverBg} border-transparent ${language === 'ar' || language === 'ku' ? 'hover:-translate-x-1.5' : 'hover:translate-x-1.5'}`
                        }`}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${
                          active 
                            ? `${item.iconBg} scale-110 rotate-6` 
                            : `bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:scale-110 group-hover:-rotate-3`
                        }`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="tracking-wide">{item.name}</span>
                      </Link>
                    )}
                  </div>
                  
                  {isProducts && (
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isProductsExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                      <div className="flex flex-col gap-1.5 px-4 ml-4 border-l-2 border-slate-100">
                        <Link to="/products" onClick={onClose} className="group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-all">
                          <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                            <LayoutGrid className="w-4 h-4" />
                          </div>
                          {(t as any)('allCategories') || 'All Categories'}
                        </Link>
                        {categories.filter(c => c).map((category) => (
                          <Link 
                            key={category.id}
                            to={`/products?category=${category.slug || category?.name?.toLowerCase()}`} 
                            onClick={onClose} 
                            className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-all ${language === 'ar' || language === 'ku' ? 'flex-row-reverse text-right' : ''}`}
                          >
                            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                              <CategoryIcon name={category.icon} className="w-4 h-4" />
                            </div>
                            <span className={language === 'ar' || language === 'ku' ? 'font-arabic' : ''}>
                              {language === 'ku' ? (category.nameKu || category.name) : language === 'ar' ? (category.nameAr || category.name) : category.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Support Section */}
          <div className="space-y-1.5">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <span>🌈</span> {t('helpSupport')}
            </h3>
            {supportItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 border-2 transform active:scale-95 ${
                    active 
                      ? `${item.activeBg} border-transparent` 
                      : `text-slate-600 ${item.hoverBg} border-transparent ${language === 'ar' || language === 'ku' ? 'hover:-translate-x-1.5' : 'hover:translate-x-1.5'}`
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    active 
                      ? `${item.iconBg} scale-110 rotate-6` 
                      : `bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:scale-110 group-hover:-rotate-3`
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Account Section */}
          <div className="space-y-1.5">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <span>🧸</span> {t('mySpace')}
            </h3>
            {authItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 border-2 transform active:scale-95 ${
                    active 
                      ? `${item.activeBg} border-transparent` 
                      : `text-slate-600 ${item.hoverBg} border-transparent ${language === 'ar' || language === 'ku' ? 'hover:-translate-x-1.5' : 'hover:translate-x-1.5'}`
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    active 
                      ? `${item.iconBg} scale-110 rotate-6` 
                      : `bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:scale-110 group-hover:-rotate-3`
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Management Section */}
          {isStaffOrAdmin && (
            <div className="space-y-1.5">
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <span>⚡</span> {t('staffSpace')}
              </h3>
              {adminItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 border-2 transform active:scale-95 ${
                      active 
                        ? `${item.activeBg} border-transparent` 
                        : `text-slate-600 ${item.hoverBg} border-transparent ${language === 'ar' || language === 'ku' ? 'hover:-translate-x-1.5' : 'hover:translate-x-1.5'}`
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-all duration-300 ${
                      active 
                        ? `${item.iconBg} scale-110 rotate-6` 
                        : `bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:scale-110 group-hover:-rotate-3`
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="tracking-wide">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {/* Settings Section */}
          <div className="space-y-1.5">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <span>⚙️</span> {t('settings') || 'Settings'}
            </h3>
            
            {/* Language Switcher */}
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-700 tracking-wide">{t('language')}</span>
              <LanguageDropdown />
            </div>

            {/* Logout Link */}
            {currentUser && (
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className={`w-full group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300 border-2 transform active:scale-95 text-slate-600 hover:bg-rose-50/40 hover:text-rose-600 border-transparent ${language === 'ar' || language === 'ku' ? 'hover:-translate-x-1.5' : 'hover:translate-x-1.5'}`}
              >
                <div className="p-2 rounded-xl transition-all duration-300 bg-slate-50 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-600 group-hover:scale-110 group-hover:rotate-12">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="tracking-wide text-start">{t('logout')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

