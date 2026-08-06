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
  const { t } = useLanguage();

  const cartItemsCount = (cart || []).filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const wishlistCount = (wishlist || []).length;

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-3 py-2 flex items-center justify-around pb-safe">
      <Link
        to="/"
        className={`flex items-center justify-center p-2.5 rounded-2xl transition-all duration-200 relative active:scale-90 ${
          isActive('/') 
            ? 'text-rose-600 bg-rose-50/80 font-bold shadow-xs' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
        title={t('home') || 'سەرەکی'}
      >
        <Home className="w-5 h-5 stroke-[2.2]" />
      </Link>

      <Link
        to="/products"
        className={`flex items-center justify-center p-2.5 rounded-2xl transition-all duration-200 relative active:scale-90 ${
          isActive('/products') 
            ? 'text-rose-600 bg-rose-50/80 font-bold shadow-xs' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
        title={t('products') || 'بەرهەمەکان'}
      >
        <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
      </Link>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex items-center justify-center p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90"
        title={t('search') || 'گەڕان'}
      >
        <Search className="w-5 h-5 stroke-[2.2]" />
      </button>

      <Link
        to="/wishlist"
        className={`flex items-center justify-center p-2.5 rounded-2xl transition-all duration-200 relative active:scale-90 ${
          isActive('/wishlist') 
            ? 'text-rose-600 bg-rose-50/80 font-bold shadow-xs' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
        title={t('wishlist') || 'دڵخوازەکان'}
      >
        <Heart className={`w-5 h-5 stroke-[2.2] ${isActive('/wishlist') ? 'fill-rose-500' : ''}`} />
        {wishlistCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            {wishlistCount}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={onOpenCart}
        className="flex items-center justify-center p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90 relative"
        title={t('yourCart') || 'سەبەتە'}
      >
        <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
        {cartItemsCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {cartItemsCount}
          </span>
        )}
      </button>

      <Link
        to={currentUser ? "/profile" : "/login"}
        className={`flex items-center justify-center p-2.5 rounded-2xl transition-all duration-200 relative active:scale-90 ${
          isActive('/profile') || isActive('/login')
            ? 'text-rose-600 bg-rose-50/80 font-bold shadow-xs' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
        title={currentUser ? (t('profile') || 'پڕۆفایل') : (t('signIn') || 'چوونەژوور')}
      >
        <User className="w-5 h-5 stroke-[2.2]" />
      </Link>
    </div>
  );
};
