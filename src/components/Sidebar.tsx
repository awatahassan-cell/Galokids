import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { X, ChevronDown } from 'lucide-react';
import { KidsIcon, KidsIconName } from './KidsIcons';
import { CategoryIcon } from './CategoryIcon';
import { LanguageDropdown } from './LanguageDropdown';
import { StoreLogo } from './StoreLogo';
import { useScrollLock } from '../utils/useScrollLock';
import { isAdminRole, isCashierRole, isStaffOrAdminRole } from '../utils/roles';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: KidsIconName;
}

/**
 * The drawer behind the burger, for screens narrower than the desktop nav.
 *
 * Enhanced with silky-smooth spring physics, animated backdrop blur,
 * collapsible category expansion, and responsive tap feedback.
 */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout, categories, storeSettings } = useStore();
  const { t, language } = useLanguage();
  const location = useLocation();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Lock document scroll while sidebar is active
  useScrollLock(isOpen);

  const isRTL = language === 'ar' || language === 'ku';
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const storeName = storeSettings?.store_name || L('گەلۆ کیدز', 'غالو كيدز', 'Galo Kids');
  const categoryName = (c: any) =>
    (language === 'ku' && c.nameKu) || (language === 'ar' && c.nameAr) || c.name;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const browse: NavItem[] = [
    { name: t('home'), path: '/', icon: 'home' },
    { name: t('about'), path: '/about', icon: 'info' },
    { name: L('پەیوەندی', 'اتصل بنا', 'Contact'), path: '/contact', icon: 'mail' },
  ];

  const support: NavItem[] = [
    { name: t('faq'), path: '/faq', icon: 'help' },
    { name: t('shippingReturns'), path: '/shipping-returns', icon: 'truck' },
    { name: L('بەدواداچوونی داواکاری', 'تتبع الطلب', 'Track order'), path: '/track', icon: 'box' },
  ];

  const account: NavItem[] = currentUser
    ? [
        { name: t('profile'), path: '/profile', icon: 'user' },
        { name: t('wishlist'), path: '/wishlist', icon: 'heart' },
        { name: t('myOrders'), path: '/my-orders', icon: 'box' },
      ]
    : [{ name: t('signIn'), path: '/login', icon: 'login' }];

  const backOffice: NavItem[] = [
    ...(currentUser && (isAdminRole(currentUser.role) || isCashierRole(currentUser.role))
      ? [{ name: t('pos'), path: '/pos', icon: 'register' } as NavItem]
      : []),
    ...(currentUser && isAdminRole(currentUser.role)
      ? [{ name: t('admin'), path: '/admin', icon: 'shield' } as NavItem]
      : []),
  ];

  const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{children}</h3>
  );

  const Row: React.FC<{ item: NavItem }> = ({ item }) => {
    const on = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={onClose}
        className="block group focus:outline-none"
      >
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
            on ? 'bg-candy-50 text-candy-700' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span
            className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 transition-colors ${
              on ? 'bg-candy-100' : 'bg-slate-50 group-hover:bg-slate-100'
            }`}
          >
            <KidsIcon name={item.icon} className="w-[19px] h-[19px]" />
          </span>
          <span>{item.name}</span>
        </motion.div>
      </Link>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay with Smooth Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[120]"
          />

          {/* Smooth Spring-Animated Drawer */}
          <motion.aside
            dir={isRTL ? 'rtl' : 'ltr'}
            initial={{ x: isRTL ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '100%' : '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 34,
              mass: 0.8,
            }}
            className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-[310px] max-w-[86vw] bg-white/95 backdrop-blur-2xl shadow-2xl z-[130]
              flex flex-col will-change-transform border-slate-200/80 ${isRTL ? 'border-l font-arabic text-right' : 'border-r text-left'}`}
          >
            {/* Header / Brand Row */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200/80 shrink-0">
              <Link to="/" onClick={onClose} className="flex items-center gap-2.5 min-w-0 group">
                <StoreLogo className="w-[42px] h-[42px] transition-transform group-hover:scale-105" />
                <b className="text-base font-black text-slate-900 truncate min-w-0">{storeName}</b>
              </Link>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-slate-200/80 grid place-items-center text-slate-500 hover:bg-candy-50 hover:text-candy-700 transition-colors cursor-pointer shrink-0"
                aria-label={L('داخستن', 'إغلاق', 'Close')}
              >
                <X className="w-[18px] h-[18px]" />
              </motion.button>
            </div>

            {/* User Badge if logged in */}
            {currentUser && (
              <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200/70 px-3 py-2.5">
                <span className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-candy-500 to-grape-500 text-white text-sm font-black shrink-0 shadow-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
                </span>
                <span className="min-w-0">
                  <b className="block text-[13px] font-black text-slate-900 truncate">{currentUser.name}</b>
                  <small className="block text-[11px] font-bold text-slate-500 truncate">
                    {currentUser.phone || (currentUser.email && !currentUser.email.includes('@phone.user') ? currentUser.email : storeName)}
                  </small>
                </span>
              </div>
            )}

            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 hide-scrollbar">
              <div>
                <Eyebrow>{L('گەڕان', 'التصفح', 'Browse')}</Eyebrow>
                <div className="space-y-1">
                  <Row item={browse[0]} />

                  {/* Products expands into categories */}
                  <div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCategoriesOpen(v => !v)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-colors cursor-pointer ${
                        isActive('/products') ? 'bg-candy-50 text-candy-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      aria-expanded={categoriesOpen}
                    >
                      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                        isActive('/products') ? 'bg-candy-100' : 'bg-slate-50'
                      }`}>
                        <KidsIcon name="shop" className="w-[19px] h-[19px]" />
                      </span>
                      <span className="flex-1 text-start">{t('products')}</span>
                      <motion.span
                        animate={{ rotate: categoriesOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </motion.span>
                    </motion.button>

                    <AnimatePresence>
                      {categoriesOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden ps-4 space-y-0.5 pb-1 mt-1"
                        >
                          <Link
                            to="/products"
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-candy-50 hover:text-candy-700 transition-colors"
                          >
                            <KidsIcon name="sparkle" className="w-[18px] h-[18px]" />
                            {L('هەموو بەرهەمەکان', 'كل المنتجات', 'All products')}
                          </Link>
                          {(categories || []).map((c: any) => (
                            <Link
                              key={c.id}
                              to={`/products?category=${c.id}`}
                              onClick={onClose}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-candy-50 hover:text-candy-700 transition-colors"
                            >
                              <CategoryIcon name={c.icon || c.name} className="w-[18px] h-[18px]" />
                              {categoryName(c)}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {browse.slice(1).map(item => <Row key={item.path} item={item} />)}
                </div>
              </div>

              <div>
                <Eyebrow>{L('یارمەتی', 'المساعدة', 'Help')}</Eyebrow>
                <div className="space-y-1">
                  {support.map(item => <Row key={item.path} item={item} />)}
                </div>
              </div>

              <div>
                <Eyebrow>{L('هەژماری من', 'حسابي', 'My account')}</Eyebrow>
                <div className="space-y-1">
                  {account.map(item => <Row key={item.path} item={item} />)}
                </div>
              </div>

              {backOffice.length > 0 && currentUser && isStaffOrAdminRole(currentUser.role) && (
                <div>
                  <Eyebrow>{t('staffSpace')}</Eyebrow>
                  <div className="space-y-1">
                    {backOffice.map(item => <Row key={item.path} item={item} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Language & Logout */}
            <div className="border-t border-slate-200/80 p-4 space-y-2 shrink-0">
              <div className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[13px] font-black text-slate-700">{t('language')}</span>
                <LanguageDropdown variant="inline" className="mt-2.5" />
              </div>

              {currentUser && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { logout(); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold text-slate-700 hover:bg-candy-50 hover:text-candy-700 transition-colors cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl grid place-items-center bg-slate-50 shrink-0">
                    <KidsIcon name="logout" className="w-[19px] h-[19px]" />
                  </span>
                  <span>{t('logout')}</span>
                </motion.button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
