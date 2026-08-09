import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../store';
import { getColorHex, getLocalizedSizeName } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';
import { ShoppingCart, Heart, Star, Loader2, Check, Eye, ExternalLink } from 'lucide-react';
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

  // Generate consistent pastel background for vk2-pc-media matching reference image
  const mediaBgColors = [
    'bg-[#F5F5F7]', // Soft off-white / light slate
    'bg-[#FCE4EC]', // Soft pastel pink
    'bg-[#ECEFF1]', // Soft light gray
    'bg-[#FAFAFA]', // Light cream
  ];
  const charSum = (product?.id || product?.name || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mediaBg = mediaBgColors[charSum % mediaBgColors.length];

  return (
    <div className="vk2-pc group relative flex flex-col bg-white rounded-3xl border border-slate-100/90 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden font-arabic h-full p-0">
      
      {/* Vastraa Media Card Wrapper (vk2-pc-media - Flush Top Edge-to-Edge) */}
      <div className={`vk2-pc-media aspect-square sm:aspect-[4/5] ${mediaBg} overflow-hidden relative rounded-t-3xl border-b border-slate-100/50 flex items-center justify-center`}>
        
        {/* Product Image (vk2-pc-img) */}
        <Link to={`/product/${product?.id}`} className="w-full h-full block overflow-hidden">
          <img
            src={product.imageUrl}
            alt={getProductName()}
            loading="lazy"
            className="vk2-pc-img w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </Link>

        {/* Badges (vk2-pc-badge) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {totalStock === 0 ? (
            <span className="vk2-pc-badge bg-slate-900 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase">
              {t('outOfStock')}
            </span>
          ) : hasDiscount ? (
            <span className="vk2-pc-badge vk2-pc-badge-hot bg-[#FF6584] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              -{discountPct}%
            </span>
          ) : (product as any).featured ? (
            <span className="vk2-pc-badge vk2-pc-badge-hot bg-[#FF5277] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              Hot
            </span>
          ) : null}
        </div>

        {/* Wishlist Heart Button (vk2-pc-wish) */}
        <button
          onClick={handleWishlistClick}
          className="vk2-pc-wish absolute top-3 right-3 w-8 h-8 rounded-full bg-white text-slate-700 hover:text-rose-500 flex items-center justify-center transition-all shadow-md active:scale-90 z-10 cursor-pointer"
          title={isWishlisted ? t('removeFromWishlist') || 'Remove' : t('addToWishlist') || 'Add'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Quick Actions Hover Overlay (vk2-pc-actions) */}
        <div className="vk2-pc-actions absolute bottom-12 inset-x-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto z-10">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
            title={t('quickView') || 'Quick view'}
            className="vk2-pc-act-btn w-8 h-8 rounded-full bg-white text-slate-700 hover:text-rose-500 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-90 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          <Link
            to={`/product/${product?.id}`}
            title="View Detail"
            className="vk2-pc-act-btn w-8 h-8 rounded-full bg-white text-slate-700 hover:text-rose-500 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-90 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Vastraa Cart Button (vk2-pc-cart) */}
        <button 
          disabled={totalStock === 0 || isAdding}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (totalStock === 0 || isAdding) return;

            const variations = product.variations || [];
            const inStockVariations = variations.filter(v => v.stockQuantity > 0);
            
            // Check if product has colors or sizes to choose from
            const hasOptions = variations.length > 0 && variations.some(v => Boolean(v.color || v.size));

            // If product has size/color options, open QuickViewModal so user chooses color & size FIRST!
            if (hasOptions) {
              setQuickViewOpen(true);
              return;
            }

            const firstAvailable = inStockVariations[0] || variations[0];
            if (!firstAvailable) {
              setQuickViewOpen(true);
              return;
            }

            setIsAdding(true);
            setTimeout(() => {
              addToCart(product, firstAvailable, 1);
              setIsAdding(false);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }, 600);
          }}
          className={`absolute bottom-2.5 inset-x-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md z-10 cursor-pointer active:scale-95 ${
            totalStock === 0 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-slate-900 hover:bg-[#FF6584] text-white'
          }`}
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : added ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{t('added') || 'زیادکرا'}</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{t('addToCart') || 'سەبەتە'}</span>
            </>
          )}
        </button>
      </div>

      {quickViewOpen && <QuickViewModal product={product} onClose={() => setQuickViewOpen(false)} />}

      {/* Vastraa Body Info (vk2-pc-body - Padding Inside Body) */}
      <div className="vk2-pc-body p-3.5 sm:p-4 flex flex-col flex-grow bg-white">
        
        {/* Category & Rating (vk2-pc-meta) */}
        <div className="vk2-pc-meta flex items-center justify-between text-[11px] mb-1">
          <span className="vk2-pc-cat font-black uppercase text-slate-400 tracking-wider truncate max-w-[70%]">
            {getCategoryName()}
          </span>
          <div className="vk2-pc-rating flex items-center gap-1 text-slate-700 font-bold shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '0.0'}</span>
          </div>
        </div>

        {/* Product Name (vk2-pc-name) */}
        <Link to={`/product/${product?.id}`} className="block">
          <h3 className="vk2-pc-name text-xs sm:text-sm font-black text-slate-800 leading-snug line-clamp-1 group-hover:text-rose-500 transition-colors mb-2">
            {getProductName()}
          </h3>
        </Link>

        {/* Available Sizes Row (strictly from DB product.variations - zero hardcoded fallbacks) */}
        {(() => {
          // Extract real sizes directly from product.variations attached to the product data in DB
          const rawSizes = (product.variations || [])
            .map(v => v.size)
            .filter((s): s is string => Boolean(s && s.trim().length > 0));
          
          const uniqueSizes = Array.from(new Set(rawSizes));
          
          // Display sizes directly from product variations!
          const displaySizes = uniqueSizes.slice(0, 4);

          // If product data has zero sizes in DB, render NOTHING (zero fake sizes like 4Y 6Y 8Y)
          if (displaySizes.length === 0) return null;

          // Determine active size badge
          const activeIndex = displaySizes.length > 1 ? Math.min(1, displaySizes.length - 1) : 0;

          return (
            <div className="vk2-pc-sizes flex items-center gap-1.5 mb-3 overflow-x-auto scrollbar-hide py-0.5">
              {displaySizes.map((size, idx) => (
                <span 
                  key={idx} 
                  className={`vk2-pc-size text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full transition-all shrink-0 ${
                    idx === activeIndex ? 'active bg-[#FF6584] text-white shadow-2xs' : 'bg-[#F1F3F5] text-slate-500 border border-slate-200/40'
                  }`}
                >
                  {getLocalizedSizeName(String(size), language)}
                </span>
              ))}
            </div>
          );
        })()}

        {/* Footer Prices (vk2-pc-footer) */}
        <div className="vk2-pc-footer mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div className="vk2-pc-prices">
            {product.discountPrice ? (
              <div className="flex items-baseline gap-1.5">
                <span className="vk2-pc-price text-sm sm:text-base font-black text-[#FF6584]">{formatIQDLabel(Number(product.discountPrice))}</span>
                <span className="vk2-pc-old text-[11px] text-slate-400 line-through font-bold">{formatIQDLabel(Number(product.price))}</span>
              </div>
            ) : (
              <span className="vk2-pc-price text-sm sm:text-base font-black text-slate-900">{formatIQDLabel(Number(product.price))}</span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
