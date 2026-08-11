import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useStore } from '../store';
import { getColorHex, getLocalizedSizeName } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';
import { ShoppingCart, Heart, Star, Loader2, Check, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { QuickViewModal } from './QuickViewModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { categories, wishlist, toggleWishlist, addToCart } = useStore();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const categoryName = categories.find((c) => c?.id === product.categoryId)?.name;
  
  const getCategoryName = () => {
    if (categoryName === 'Boys') return t('categoryBoys') || categoryName;
    if (categoryName === 'Girls') return t('categoryGirls') || categoryName;
    if (categoryName === 'Infants') return t('categoryInfants') || categoryName;
    if (categoryName === 'Toys') return t('categoryToys') || categoryName;
    return categoryName;
  };
  
  const variations = product.variations || [];
  const totalStock = variations.length > 0 
    ? variations.reduce((acc, curr) => acc + (Number(curr.stockQuantity) || 0), 0)
    : ((product as any).stockQuantity !== undefined ? Number((product as any).stockQuantity) : 99);

  const hasDiscount = !!product.discountPrice && Number(product.discountPrice) < Number(product.price);
  const discountPct = hasDiscount ? Math.round((1 - Number(product.discountPrice) / Number(product.price)) * 100) : 0;

  const isWishlisted = wishlist.includes(product?.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product?.id);
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    navigate(`/product/${product?.id}`);
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

  // A stable pastel wash per product, so a grid of cards reads as a set
  // rather than a row of grey boxes. Derived from the id so it never
  // reshuffles between renders.
  const mediaBgColors = [
    'bg-gradient-to-br from-candy-50 to-candy-200',
    'bg-gradient-to-br from-bubble-50 to-bubble-200',
    'bg-gradient-to-br from-sunny-50 to-sunny-200',
    'bg-gradient-to-br from-grape-50 to-grape-200',
    'bg-gradient-to-br from-mint-50 to-mint-100',
  ];
  const charSum = (product?.id || product?.name || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mediaBg = mediaBgColors[charSum % mediaBgColors.length];

  // What the shopper actually saves, in dinars — more persuasive than a bare
  // percentage, and it matches what the cart will subtract.
  const saveAmount = hasDiscount ? Number(product.price) - Number(product.discountPrice) : 0;

  return (
    <motion.div 
      onClick={handleCardClick}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
      className="vk2-pc group relative flex flex-col bg-white rounded-3xl border border-slate-100/90 shadow-xs hover:shadow-xl transition-shadow duration-300 overflow-hidden font-arabic h-full p-0 cursor-pointer select-none"
    >
      
      {/* Vastraa Media Card Wrapper */}
      <div className={`vk2-pc-media aspect-[4/5] ${mediaBg} overflow-hidden relative rounded-t-3xl border-b border-slate-100/50 flex items-center justify-center`}>
        
        {/* Product Image */}
        <Link to={`/product/${product?.id}`} className="w-full h-full block overflow-hidden">
          <img
            src={product.imageUrl}
            alt={getProductName()}
            loading="lazy"
            className="vk2-pc-img w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {totalStock === 0 ? (
            <span className="vk2-pc-badge bg-slate-900 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase">
              {t('outOfStock')}
            </span>
          ) : hasDiscount ? (
            <span className="vk2-pc-badge vk2-pc-badge-hot bg-candy-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-arabic">
              {language === 'ku' ? `داشکانی %${discountPct}` : language === 'ar' ? `خصم %${discountPct}` : `-${discountPct}%`}
            </span>
          ) : (product as any).featured ? (
            <span className="vk2-pc-badge vk2-pc-badge-hot bg-[#E0607A] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              Hot
            </span>
          ) : null}
        </div>

        {/* Wishlist stays pinned to the image; quick-view moves into the
            action row below so the photo is not covered by chrome. */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 end-3 w-9 h-9 rounded-full bg-white/95 text-slate-700 hover:text-candy-700 flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer z-10"
          title={isWishlisted ? t('removeFromWishlist') || 'Remove' : t('addToWishlist') || 'Add'}
        >
          <Heart className={`w-[18px] h-[18px] ${isWishlisted ? 'fill-candy-500 text-candy-700' : ''}`} />
        </button>

        {/* Action row. Hidden until hover on pointer devices; always shown on
            touch, where there is no hover state to reveal it. */}
        <div className="absolute bottom-2.5 inset-x-3 z-10 flex items-center gap-1.5 translate-y-[calc(100%+14px)] opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
        <button
          onClick={handleQuickViewClick}
          className="w-9 h-9 shrink-0 rounded-xl bg-white text-slate-700 hover:bg-ink-900 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer"
          title={t('quickView') || 'تێڕوانینی خێرا'}
        >
          <Eye className="w-4 h-4" />
        </button>
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
          title={t('addToCart') || 'سەبەتە'}
          aria-label={t('addToCart') || 'سەبەتە'}
          className={`shrink-0 sm:flex-1 sm:min-w-0 w-9 h-9 sm:w-auto sm:h-auto sm:py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 ${
            totalStock === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-ink-900 hover:bg-candy-500 text-white'
          }`}
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
          ) : added ? (
            <>
              <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" />
              {/* The label is dropped on a phone — the card is half the screen
                  wide there, and the text wrapped over the picture. */}
              <span className="hidden sm:inline">{t('added') || 'زیادکرا'}</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{t('addToCart') || 'سەبەتە'}</span>
            </>
          )}
        </button>
        </div>
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
            <Star className="w-3.5 h-3.5 fill-sunny-500 text-sunny-600" />
            <span className="text-xs font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '0.0'}</span>
          </div>
        </div>

        {/* Product Name (vk2-pc-name) */}
        <Link to={`/product/${product?.id}`} className="block">
          <h3 className="vk2-pc-name text-xs sm:text-sm font-black text-slate-800 leading-snug line-clamp-1 group-hover:text-candy-700 transition-colors mb-2">
            {getProductName()}
          </h3>
        </Link>

        {/* Available Colors Row (only small color circles, no text) */}
        {(() => {
          const rawColors = [
            ...(product.variations || []).map(v => v.color),
            ...((product as any).colors || [])
          ].filter((c): c is string => Boolean(c && typeof c === 'string' && c.trim().length > 0));

          const uniqueColors = Array.from(new Set(rawColors.map(c => c.trim())));

          if (uniqueColors.length === 0) return null;

          return (
            <div className="vk2-pc-colors flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-hide py-0.5">
              {uniqueColors.slice(0, 7).map((color, idx) => {
                const hex = getColorHex(color);
                return (
                  <span
                    key={idx}
                    className="w-3.5 h-3.5 rounded-full border border-slate-300/90 shadow-2xs shrink-0 inline-block transition-transform hover:scale-110"
                    style={{ backgroundColor: hex }}
                    title={color}
                  />
                );
              })}
              {uniqueColors.length > 7 && (
                <span className="text-[10px] text-slate-400 font-bold shrink-0 dir-ltr">
                  +{uniqueColors.length - 7}
                </span>
              )}
            </div>
          );
        })()}

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
                    idx === activeIndex ? 'active bg-candy-500 text-white shadow-2xs' : 'bg-[#F1F3F5] text-slate-500 border border-slate-200/40'
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
              <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-1">
                <span className="vk2-pc-price text-sm sm:text-base font-black text-candy-700">{formatIQDLabel(Number(product.discountPrice))}</span>
                <span className="vk2-pc-old text-[11px] text-slate-400 line-through font-bold">{formatIQDLabel(Number(product.price))}</span>
                {saveAmount > 0 && (
                  <span className="text-[10px] font-black text-mint-700 bg-mint-50 rounded-md px-1.5 py-0.5">
                    {language === 'ku' ? 'پاشەکەوت' : language === 'ar' ? 'توفير' : 'Save'} {formatIQDLabel(saveAmount)}
                  </span>
                )}
              </div>
            ) : (
              <span className="vk2-pc-price text-sm sm:text-base font-black text-slate-900">{formatIQDLabel(Number(product.price))}</span>
            )}
          </div>
        </div>

      </div>

    </motion.div>
  );
};
