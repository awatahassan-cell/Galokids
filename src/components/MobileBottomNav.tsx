import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { KidsIcon, KidsIconName } from './KidsIcons';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

interface MobileBottomNavProps {
  onOpenSearch?: () => void;
}

/**
 * The phone tab bar: five labelled destinations.
 *
 * The active tab is marked by a short bar along the top edge rather than a
 * filled shape, so the row keeps its rhythm and the label stays readable.
 * It hides at lg, where the header's own navigation takes over.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const location = useLocation();
  const { cart, wishlist, currentUser } = useStore();
  const { t, language } = useLanguage();
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const cartCount = (cart || []).filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const wishlistCount = (wishlist || []).length;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const tab = (on: boolean) =>
    `relative flex flex-col items-center gap-1 pt-2 pb-2.5 px-0.5 text-[10.5px] font-extrabold transition-colors ${
      on ? 'text-candy-700' : 'text-slate-500'
    }`;

  /** The short pink rule that marks the active tab. */
  const marker = (on: boolean) =>
    on ? <span className="absolute top-0 inset-x-[26%] h-[3px] rounded-b-[5px] bg-candy-500" /> : null;

  /**
   * The icon in its tile. The selected tab keeps the icon's own colours on a
   * soft pink ground; the rest wear a single muted tint, so exactly one tab
   * reads as chosen instead of five competing colours along the bottom.
   */
  const tile = (name: KidsIconName, on: boolean) => (
    <span
      className={`w-9 h-9 rounded-2xl grid place-items-center transition-colors ${
        on ? 'bg-candy-100' : 'bg-transparent'
      }`}
    >
      <KidsIcon name={name} className="w-[22px] h-[22px]" tint={on ? undefined : 'ink'} />
    </span>
  );

  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute top-1 start-[26%] min-w-[17px] h-[17px] px-1 rounded-full bg-candy-500 text-white text-[9.5px] font-black grid place-items-center font-sans border-2 border-white">
        {n}
      </span>
    ) : null;

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-[55] grid grid-cols-5 bg-white border-t border-slate-200/80 font-arabic"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link to="/" className={tab(isActive('/'))}>
        {marker(isActive('/'))}
        {tile('home', isActive('/'))}
        {t('home')}
      </Link>

      <Link to="/products" className={tab(isActive('/products'))}>
        {marker(isActive('/products'))}
        {tile('shop', isActive('/products'))}
        {L('بەرهەم', 'المنتجات', 'Shop')}
      </Link>

      <Link to="/cart" className={tab(isActive('/cart'))}>
        {marker(isActive('/cart'))}
        {tile('basket', isActive('/cart'))}
        {badge(cartCount)}
        {L('سەبەتە', 'السلة', 'Basket')}
      </Link>

      <Link to="/wishlist" className={tab(isActive('/wishlist'))}>
        {marker(isActive('/wishlist'))}
        {tile('heart', isActive('/wishlist'))}
        {badge(wishlistCount)}
        {L('دڵخواز', 'المفضلة', 'Saved')}
      </Link>

      <Link
        to={currentUser ? '/profile' : '/login'}
        className={tab(isActive('/profile') || isActive('/login'))}
      >
        {marker(isActive('/profile') || isActive('/login'))}
        {tile('user', isActive('/profile') || isActive('/login'))}
        {L('هەژمار', 'حسابي', 'Account')}
      </Link>
    </nav>
  );
};
