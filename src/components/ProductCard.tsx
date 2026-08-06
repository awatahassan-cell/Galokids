import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../store';
import { getColorHex } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';
import { ShoppingCart, Heart, Star, Loader2, Check, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { QuickViewModal } from './QuickViewModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { categories, wishlist, toggleWishlist, addToCart } = useStore();
  const { t, language } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const categoryName = categories.find((c) => c?.id === product.categoryId)?.name;
  
  // Try to use translated category name if available in t, else fallback to english
  const getCategoryName = () => {
    if (categoryName === 'Boys') return t('categoryBoys') || categoryName;
    if (categoryName === 'Girls') return t('categoryGirls') || categoryName;
    if (categoryName === 'Infants') return t('categoryInfants') || categoryName;
    if (categoryName === 'Toys') return t('categoryToys') || categoryName;
    return categoryName;
  }
  
  // Compute available colors and sizes from variations with stock > 0
  const variations = product.variations || [];
  const availableColors = Array.from(new Set(variations.filter(v => v.stockQuantity > 0 && typeof v.color === 'string' && v.color.trim() !== '').map(v => v.color))) as string[];
  const totalStock = variations.length > 0 
    ? variations.reduce((acc, curr) => acc + (Number(curr.stockQuantity) || 0), 0)
    : ((product as any).stockQuantity !== undefined ? Number((product as any).stockQuantity) : 99);

  const LOW_STOCK_THRESHOLD = 5;
  const isLowStock = totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD;
  const hasDiscount = !!product.discountPrice && Number(product.discountPrice) < Number(product.price);
  const discountPct = hasDiscount ? Math.round((1 - Number(product.discountPrice) / Number(product.price)) * 100) : 0;
  // "New" if created within the last 14 days (created_at comes from the API).
  const createdAt = (product as any).createdAt || (product as any).date;
  const isNew = createdAt ? (Date.now() - new Date(createdAt).getTime()) < 14 * 86400000 : false;

  const isWishlisted = wishlist.includes(product?.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product?.id);
  };

  const reviews = product.reviews || [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
    : 0;

  const getProductName = () => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  return (
    <Link to={`/product/${product?.id}`} className="group relative flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-[0_10px_40px_-10px_rgba(14,165,233,0.15)] transition-all duration-300 transform hover:-translate-y-1">
      <div className="aspect-square sm:aspect-[4/5] bg-slate-50 overflow-hidden relative rounded-t-[1.5rem] sm:rounded-t-[2rem]">
        <img
          src={product.imageUrl}
          alt={getProductName()}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {totalStock === 0 && (
            <span className="bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-sm">
              {t('outOfStock')}
            </span>
          )}
          {hasDiscount && totalStock > 0 && (
            <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-sm">
              -{discountPct}%
            </span>
          )}
          {isNew && totalStock > 0 && (
            <span className="bg-emerald-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-sm">
              {t('badgeNew') || 'NEW'}
            </span>
          )}
          {isLowStock && (
            <span className="bg-amber-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-sm">
              {(t('onlyXLeft') || 'Only {n} left').replace('{n}', String(totalStock))}
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <button
            onClick={handleWishlistClick}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-white/95 backdrop-blur-sm rounded-full text-slate-500 hover:text-rose-500 flex items-center justify-center transition-all shadow-md active:scale-90"
            title={isWishlisted ? t('removeFromWishlist') || 'Remove' : t('addToWishlist') || 'Add'}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
            title={t('quickView') || 'Quick view'}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-white/95 backdrop-blur-sm rounded-full text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-all shadow-md active:scale-90 opacity-0 group-hover:opacity-100 hidden sm:flex"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
      {quickViewOpen && <QuickViewModal product={product} onClose={() => setQuickViewOpen(false)} />}
      <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-0.5 sm:mb-1">
          <p className="text-[8px] sm:text-[10px] text-sky-500 font-extrabold uppercase tracking-widest">{getCategoryName()}</p>
                    <div className="text-right">
            {product.discountPrice ? (
              <>
                <p className="text-[10px] sm:text-xs text-slate-400 line-through">{formatIQDLabel(Number(product.price))}</p>
                <p className="text-xs sm:text-base font-extrabold text-rose-500">{formatIQDLabel(Number(product.discountPrice))}</p>
              </>
            ) : (
              <p className="text-xs sm:text-base font-extrabold text-slate-900">{formatIQDLabel(Number(product.price))}</p>
            )}
          </div>
        </div>
        <h3 className="text-xs sm:text-sm font-bold font-display text-slate-800 leading-tight mb-1 sm:mb-2 line-clamp-1 sm:line-clamp-2">
          {getProductName()}
        </h3>
        
        {avgRating > 0 && (
          <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] text-slate-700 font-bold">{avgRating}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">({product.reviews?.length})</span>
          </div>
        )}
        
        <div className="mt-auto flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-50">
          <div className="flex -space-x-1 sm:-space-x-1.5">
            {availableColors.slice(0, 3).map((color, i) => (
              <div 
                key={i} 
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: getColorHex(color) }}
                title={color}
              />
            ))}
            {availableColors.length > 3 && (
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[7px] sm:text-[8px] text-slate-600 font-bold shadow-sm">
                +{availableColors.length - 3}
              </div>
            )}
          </div>
          
          <button 
            disabled={totalStock === 0 || isAdding}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (totalStock === 0 || isAdding) return;

              // Find first variation with stock quantity > 0
              const firstAvailable = (product.variations || []).find(v => v.stockQuantity > 0);
              if (!firstAvailable) return;

              setIsAdding(true);
              setTimeout(() => {
                addToCart(product, firstAvailable, 1);
                setIsAdding(false);
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }, 600);
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full cursor-pointer flex items-center justify-center transition-all shrink-0 active:scale-90 ${
              totalStock === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-md hover:shadow-sky-200'
            }`}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : added ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
};
