import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

interface MobileBottomNavProps {
  onOpenCart: () => void;
  onOpenSearch?: () => void;
}

/**
 * The phone tab bar: five labelled destinations.
 *
 * The active tab is marked by a short bar along the top edge rather than a
 * filled shape, so the row keeps its rhythm and the label stays readable.
 * It hides at lg, where the header's own navigation takes over.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenCart }) => {
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
    `relative flex flex-col items-center gap-[3px] pt-[9px] pb-[11px] px-0.5 text-[10.5px] font-extrabold transition-colors ${
      on ? 'text-candy-700' : 'text-slate-500'
    }`;

  /** The short pink rule that marks the active tab. */
  const marker = (on: boolean) =>
    on ? <span className="absolute top-0 inset-x-[26%] h-[3px] rounded-b-[5px] bg-candy-500" /> : null;

  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute top-[4px] start-[27%] min-w-[17px] h-[17px] px-1 rounded-full bg-candy-500 text-white text-[9.5px] font-black grid place-items-center font-sans">
        {n}
      </span>
    ) : null;

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-[55] grid grid-cols-5 bg-white/97 backdrop-blur-xl border-t border-slate-200/80 font-arabic"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link to="/" className={tab(isActive('/'))}>
        {marker(isActive('/'))}
        <Home className="w-[21px] h-[21px]" />
        {t('home')}
      </Link>

      <Link to="/products" className={tab(isActive('/products'))}>
        {marker(isActive('/products'))}
        <LayoutGrid className="w-[21px] h-[21px]" />
        {L('بەرهەم', 'المنتجات', 'Shop')}
      </Link>

      <button type="button" onClick={onOpenCart} className={`${tab(false)} cursor-pointer`}>
        <ShoppingBag className="w-[21px] h-[21px]" />
        {badge(cartCount)}
        {L('سەبەتە', 'السلة', 'Basket')}
      </button>

      <Link to="/wishlist" className={tab(isActive('/wishlist'))}>
        {marker(isActive('/wishlist'))}
        <Heart className={`w-[21px] h-[21px] ${isActive('/wishlist') ? 'fill-candy-500' : ''}`} />
        {badge(wishlistCount)}
        {L('دڵخواز', 'المفضلة', 'Saved')}
      </Link>

      <Link
        to={currentUser ? '/profile' : '/login'}
        className={tab(isActive('/profile') || isActive('/login'))}
      >
        {marker(isActive('/profile') || isActive('/login'))}
        <User className="w-[21px] h-[21px]" />
        {L('هەژمار', 'حسابي', 'Account')}
      </Link>
    </nav>
  );
};
