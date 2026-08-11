import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Heart, Search, ShoppingCart, User } from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

interface MobileBottomNavProps {
  onOpenCart: () => void;
  onOpenSearch?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenCart, onOpenSearch }) => {
  const location = useLocation();
  const { cart, wishlist, currentUser } = useStore();
  const { t, language } = useLanguage();
  const isArabicOrKurdish = language === 'ar' || language === 'ku';

  const cartItemsCount = (cart || []).filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const wishlistCount = (wishlist || []).length;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 w-full z-40 bg-white/95 backdrop-blur-xl text-slate-700 rounded-none px-2 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-between border-t border-slate-200/90 ${isArabicOrKurdish ? 'font-arabic' : 'font-sans'}`}>
      <Link
        to="/"
        className={`flex items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
          isActive('/') 
            ? 'text-candy-700' 
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title={t('home') || 'سەرەکی'}
        aria-label={t('home') || 'سەرەکی'}
      >
        <Home className="w-5.5 h-5.5 stroke-[2.2]" />
      </Link>

      <Link
        to="/products"
        className={`flex items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
          isActive('/products') 
            ? 'text-candy-700' 
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title={t('products') || 'بەرهەم'}
        aria-label={t('products') || 'بەرهەم'}
      >
        <ShoppingBag className="w-5.5 h-5.5 stroke-[2.2]" />
      </Link>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex items-center justify-center flex-1 py-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all active:scale-95 cursor-pointer"
        title={t('search') || 'گەڕان'}
        aria-label={t('search') || 'گەڕان'}
      >
        <Search className="w-5.5 h-5.5 stroke-[2.2]" />
      </button>

      <Link
        to="/wishlist"
        className={`flex items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
          isActive('/wishlist') 
            ? 'text-candy-700' 
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title={t('wishlist') || 'دڵخواز'}
        aria-label={t('wishlist') || 'دڵخواز'}
      >
        <div className="relative">
          <Heart className={`w-5.5 h-5.5 stroke-[2.2] ${isActive('/wishlist') ? 'fill-candy-600' : ''}`} />
          {wishlistCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 bg-candy-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white shadow-xs">
              {wishlistCount}
            </span>
          )}
        </div>
      </Link>

      <Link
        to={currentUser ? "/profile" : "/login"}
        className={`flex items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 relative active:scale-95 ${
          isActive('/profile') || isActive('/login')
            ? 'text-candy-700' 
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title={currentUser ? (t('profile') || 'پڕۆفایل') : (t('signIn') || 'چوونەژوور')}
        aria-label={currentUser ? (t('profile') || 'پڕۆفایل') : (t('signIn') || 'چوونەژوور')}
      >
        <User className="w-5.5 h-5.5 stroke-[2.2]" />
      </Link>
    </div>
  );
};
