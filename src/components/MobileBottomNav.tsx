import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { KidsIcon, KidsIconName } from './KidsIcons';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

interface MobileBottomNavProps {
  onOpenSearch?: () => void;
}

interface NavItem {
  path: string;
  matchPath: string;
  icon: KidsIconName;
  labelKu: string;
  labelAr: string;
  labelEn: string;
  badgeCount?: number;
}

/**
 * The phone tab bar: five interactive, smoothly animated destinations.
 *
 * Features:
 * - Fluid sliding active marker & background tile powered by layoutId
 * - Snappy spring icon scales and gentle vertical lift on active selection
 * - Spring-bounced notification badge for cart & wishlist changes
 * - Tactile press feedback on touch (whileTap)
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const location = useLocation();
  const { cart, wishlist, currentUser } = useStore();
  const { language } = useLanguage();

  const cartCount = (cart || []).filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const wishlistCount = (wishlist || []).length;

  const navItems: NavItem[] = [
    {
      path: '/',
      matchPath: '/',
      icon: 'home',
      labelKu: 'سەرەکی',
      labelAr: 'الرئيسية',
      labelEn: 'Home',
    },
    {
      path: '/products',
      matchPath: '/products',
      icon: 'shop',
      labelKu: 'بەرهەم',
      labelAr: 'المنتجات',
      labelEn: 'Shop',
    },
    {
      path: '/cart',
      matchPath: '/cart',
      icon: 'basket',
      labelKu: 'سەبەتە',
      labelAr: 'السلة',
      labelEn: 'Basket',
      badgeCount: cartCount,
    },
    {
      path: '/wishlist',
      matchPath: '/wishlist',
      icon: 'heart',
      labelKu: 'دڵخواز',
      labelAr: 'المفضلة',
      labelEn: 'Saved',
      badgeCount: wishlistCount,
    },
    {
      path: currentUser ? '/profile' : '/login',
      matchPath: currentUser ? '/profile' : '/login',
      icon: 'user',
      labelKu: 'هەژمار',
      labelAr: 'حسابي',
      labelEn: 'Account',
    },
  ];

  const isTabActive = (item: NavItem) => {
    if (item.matchPath === '/') return location.pathname === '/';
    if (item.matchPath === '/login' || item.matchPath === '/profile') {
      return location.pathname.startsWith('/profile') || location.pathname.startsWith('/login') || location.pathname.startsWith('/my-orders');
    }
    return location.pathname.startsWith(item.matchPath);
  };

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-[55] bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] font-arabic select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-[62px] items-stretch">
        {navItems.map((item) => {
          const active = isTabActive(item);
          const label = language === 'ku' ? item.labelKu : language === 'ar' ? item.labelAr : item.labelEn;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center pt-1.5 pb-1 px-1 transition-colors group cursor-pointer focus:outline-none"
            >
              {/* Sliding Active Indicator Line along the top edge */}
              {active && (
                <motion.span
                  layoutId="mobileNavActiveLine"
                  className="absolute top-0 inset-x-3 sm:inset-x-5 h-[3px] rounded-b-full bg-gradient-to-r from-candy-500 via-rose-500 to-candy-600 shadow-[0_2px_8px_rgba(244,63,94,0.4)]"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                  }}
                />
              )}

              {/* Interactive Icon Box with animated tile background */}
              <motion.div
                whileTap={{ scale: 0.88 }}
                animate={{
                  scale: active ? 1.08 : 1,
                  y: active ? -1 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 26,
                }}
                className="relative flex flex-col items-center"
              >
                <span className="relative w-8 h-8 rounded-2xl grid place-items-center">
                  {/* Sliding Background Glow Tile for active tab */}
                  {active && (
                    <motion.span
                      layoutId="mobileNavActiveTile"
                      className="absolute inset-0 rounded-2xl bg-candy-50 border border-candy-200/80 shadow-xs"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}

                  <span className="relative z-10">
                    <KidsIcon
                      name={item.icon}
                      className="w-[21px] h-[21px] transition-transform duration-200"
                      tint={active ? undefined : 'ink'}
                    />
                  </span>

                  {/* Bouncing Notification Badge */}
                  <AnimatePresence>
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <motion.span
                        key={item.badgeCount}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 550,
                          damping: 24,
                        }}
                        className="absolute -top-1 -start-1 min-w-[17px] h-[17px] px-1 rounded-full bg-candy-500 text-white text-[9.5px] font-black grid place-items-center font-sans border-2 border-white shadow-xs z-20"
                      >
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                {/* Tab Label */}
                <motion.span
                  animate={{
                    color: active ? '#be185d' : '#64748b',
                    fontWeight: active ? 800 : 700,
                  }}
                  className="text-[10px] tracking-tight mt-0.5 leading-none"
                >
                  {label}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
