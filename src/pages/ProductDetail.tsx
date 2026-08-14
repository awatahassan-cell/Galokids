import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { ArrowLeft, ArrowRight, ShoppingBag, Truck, RefreshCcw, Heart, Star, Loader2, Check, X, Trash2, CheckCircle, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { whatsappLink, shareOnWhatsApp } from '../utils/whatsapp';
import { ProductVariation } from '../types';
import { ProductDetailSkeleton } from '../components/ProductDetailSkeleton';
import { ProductCard } from '../components/ProductCard';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';
import { KidsIcon, KidsIconName } from '../components/KidsIcons';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, categories, cart, addToCart, removeFromCart, updateCartItemQuantity, wishlist, toggleWishlist, addReview, recordRecentlyViewed } = useStore();
  const { t, language, dir } = useLanguage();
  const isRTL = dir === 'rtl' || language === 'ku' || language === 'ar';
  const [isLoading, setIsLoading] = useState(true);
  const relatedScrollRef = useRef<HTMLDivElement>(null);

  const product = products.find(p => p?.id === id);
  const categoryName = categories.find((c) => c?.id === product?.categoryId)?.name;

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCat = products.filter(p => p.id !== product.id && p.categoryId === product.categoryId);
    return sameCat.length > 0 ? sameCat.slice(0, 10) : products.filter(p => p.id !== product.id).slice(0, 10);
  }, [product, products]);

  // Remember this product for the "Recently viewed" row on the home page.
  useEffect(() => {
    if (id) recordRecentlyViewed(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ author: '', rating: 5, comment: '', imageUrl: '' });

  // Loading/success cart states placed at top-level to prevent conditional hook violations
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isPreviewGalleryOpen, setIsPreviewGalleryOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Body scroll lock when preview gallery modal is open
  useEffect(() => {
    if (isPreviewGalleryOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPreviewGalleryOpen]);

  // Mobile swipe gestures for image slider
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isSwiping = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isSwiping.current = false;
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || allImages.length <= 1) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 35;

    if (Math.abs(distance) >= minSwipeDistance) {
      isSwiping.current = true;
      const currIdx = allImages.indexOf(activeImage);
      if (distance > 0) {
        // Swiped Left -> Next Image
        const nextIdx = (currIdx + 1) % allImages.length;
        setActiveImage(allImages[nextIdx]);
      } else {
        // Swiped Right -> Previous Image
        const prevIdx = (currIdx - 1 + allImages.length) % allImages.length;
        setActiveImage(allImages[prevIdx]);
      }
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const shareData = {
      title: getProductName(),
      text: getProductName(),
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard if share was cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  // Cart quantities map per variation ID
  const [variationCartQuantities, setVariationCartQuantities] = useState<Record<string, number>>({});

  // Selected variations list queued for mass addition
  const [queuedVariants, setQueuedVariants] = useState<{ variation: ProductVariation; quantity: number }[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isWishlisted = product ? wishlist.includes(product.id) : false;

  const getProductName = () => {
    if (!product) return '';
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const getItemProductName = (p?: any) => {
    if (!p) return '';
    if (language === 'ku' && p.nameKu) return p.nameKu;
    if (language === 'ar' && p.nameAr) return p.nameAr;
    return p.name;
  };

  const getProductDescription = () => {
    if (!product) return '';
    if (language === 'ku' && product.descriptionKu) return product.descriptionKu;
    if (language === 'ar' && product.descriptionAr) return product.descriptionAr;
    return product.description;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoading(false);
  }, [id]);

  const [activeImage, setActiveImage] = useState<string>('');

  // On mount or product selection: update first active image safely
  useEffect(() => {
    if (product?.imageUrl) {
      setActiveImage(product.imageUrl);
    }
  }, [product]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const images: string[] = [];
    if (product.imageUrl) {
      images.push(product.imageUrl);
    }
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach(img => {
        if (img && !images.includes(img)) {
          images.push(img);
        }
      });
    }
    return images;
  }, [product]);

  // Available colors
  const availableColors = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set((product.variations || []).filter(v => typeof v.color === 'string' && v.color.trim() !== '').map(v => v.color)));
  }, [product]);

  // Set initial selected color
  React.useEffect(() => {
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor]);

  // Available sizes for selected color
  const availableSizes = useMemo(() => {
    if (!product || !selectedColor) return [];
    return (product.variations || [])
      .filter(v => v.color === selectedColor)
      .map(v => v.size);
  }, [product, selectedColor]);

  // Set initial selected size when color changes
  React.useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  // Selected variation
  const selectedVariation = useMemo(() => {
    if (!product || !selectedColor || !selectedSize) return null;
    return (product.variations || []).find(v => v.color === selectedColor && v.size === selectedSize);
  }, [product, selectedColor, selectedSize]);

  if (isLoading) {
    return (
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Link to="/products" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} /> {t('backToProducts')}
        </Link>
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('noProductsFound')}</h2>
        <button onClick={() => navigate(-1)} className="text-grape-700 font-medium hover:text-indigo-700">
          {t('backToProducts')}
        </button>
      </div>
    );
  }

  const handleQueueVariation = () => {
    if (selectedVariation && quantity > 0) {
      setQueuedVariants(prev => {
        const existing = prev.find(item => item.variation.id === selectedVariation.id);
        if (existing) {
          return prev.map(item =>
            item.variation.id === selectedVariation.id
              ? { ...item, quantity: Math.min(item.quantity + quantity, selectedVariation.stockQuantity) }
              : item
          );
        }
        return [...prev, { variation: selectedVariation, quantity }];
      });
      setQuantity(1);
    }
  };

  const handleRemoveQueued = (variationId: string) => {
    setQueuedVariants(prev => prev.filter(item => item.variation.id !== variationId));
  };

  const handleAddToCart = () => {
    if (isAddingToCart) return;

    if (queuedVariants.length > 0) {
      setIsAddingToCart(true);
      setTimeout(() => {
        queuedVariants.forEach(item => {
          addToCart(product!, item.variation, item.quantity);
        });
        setIsAddingToCart(false);
        setAddedToCart(true);
        setQueuedVariants([]); // reset
        setTimeout(() => setAddedToCart(false), 1500);
      }, 400);
    } else if (selectedVariation) {
      setIsAddingToCart(true);
      setTimeout(() => {
        addToCart(product!, selectedVariation, quantity);
        setIsAddingToCart(false);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 1500);
      }, 400);
    }
  };


  const avgRating = product?.reviews && product.reviews.length > 0
    ? product.reviews.reduce((acc, rev) => acc + rev.rating, 0) / product.reviews.length
    : 0;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product && reviewForm.author && reviewForm.comment) {
      addReview(product.id, {
        author: reviewForm.author,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        ...(reviewForm.imageUrl ? { imageUrl: reviewForm.imageUrl } : {})
      });
  setReviewForm({ author: '', rating: 5, comment: '', imageUrl: '' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10 font-arabic"
    >
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Image Frame & Thumbnails (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div 
            onClick={() => {
              if (!isSwiping.current) setIsPreviewGalleryOpen(true);
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="aspect-[4/5] bg-slate-50/80 rounded-3xl overflow-hidden border border-slate-200/80 shadow-md relative cursor-zoom-in group/mainimg flex items-center justify-center max-h-[75vh] sm:max-h-none select-none touch-pan-y"
          >
            {/* Top Left Overlay Actions: Share & Wishlist Buttons */}
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="absolute top-4 left-4 z-20 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20"
                title={copiedLink ? (language === 'ku' ? 'کۆپیکرا!' : language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ku' ? 'بڵاوکردنەوە' : language === 'ar' ? 'مشاركة' : 'Share')}
              >
                {copiedLink ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Share2 className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20 ${
                  isWishlisted 
                    ? 'bg-candy-500 text-white' 
                    : 'bg-slate-900/60 hover:bg-slate-900 text-white'
                }`}
                title={isWishlisted ? t('removeFromWishlist') || 'Remove' : t('addToWishlist') || 'Add'}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white text-white' : 'text-white'}`} />
              </button>
            </div>

            {/* Top Right Overlay Action: Back Button */}
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="absolute top-4 right-4 z-20 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(-1);
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20 group/backbtn"
                title={t('backToProducts') || (language === 'ku' ? 'گەڕانەوە' : language === 'ar' ? 'الرجوع' : 'Back')}
              >
                <ArrowRight className={`w-5 h-5 text-white transition-transform ${isRTL ? '' : 'rotate-180'}`} />
              </button>
            </div>

            {/* Sale Badge */}
            {product.discountPrice && (
              <div className="absolute top-16 left-4 sm:top-auto sm:bottom-4 z-10 pointer-events-none">
                <span className="bg-candy-500 text-white text-[10px] sm:text-xs font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full uppercase tracking-wider shadow-md font-arabic">
                  {language === 'ku' 
                    ? `داشکانی %${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}` 
                    : language === 'ar' 
                    ? `خصم %${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}` 
                    : `SALE -${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}%`}
                </span>
              </div>
            )}

            {/* Left & Right Prev/Next Image Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currIdx = allImages.indexOf(activeImage);
                    const prevIdx = (currIdx - 1 + allImages.length) % allImages.length;
                    setActiveImage(allImages[prevIdx]);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20"
                  aria-label="Previous Image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currIdx = allImages.indexOf(activeImage);
                    const nextIdx = (currIdx + 1) % allImages.length;
                    setActiveImage(allImages[nextIdx]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/50 hover:bg-slate-900 text-white shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20"
                  aria-label="Next Image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Bottom Carousel Dots Indicator */}
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/20"
                >
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeImage === img ? 'w-5 bg-candy-500' : 'w-2 bg-white/70 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Link Copied Notification Banner */}
            <AnimatePresence>
              {copiedLink && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white text-xs font-black px-4 py-2 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none whitespace-nowrap border border-white/20"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ku' ? 'لینکی بەرهەمەکە کۆپیکرا!' : language === 'ar' ? 'تم نسخ رابط المنتج!' : 'Product link copied!'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                src={activeImage} 
                alt={getProductName()} 
                className="w-full h-full object-cover object-center group-hover/mainimg:scale-105 transition-transform duration-500"
              />
            </AnimatePresence>

            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/mainimg:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="bg-white/90 backdrop-blur-md text-slate-800 text-xs font-black px-4 py-2 rounded-full shadow-lg">Click to Enlarge Gallery</span>
            </div>
          </div>

          {/* Thumbnails Gallery Strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide">
              {allImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all p-0.5 bg-white ${
                    activeImage === img 
                      ? 'border-candy-500 ring-2 ring-candy-500/20 scale-105 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover object-center rounded-xl" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col">
          
          {/* Category & Rating Row */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-xs font-black text-candy-700 uppercase tracking-wider">
              {(product as any).categoryName || (language === 'ku' ? 'چاکەت و کراس' : 'JACKET')}
            </span>
            
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-full px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-sunny-500 text-sunny-600" />
              <span className="font-black text-slate-900">{avgRating > 0 ? avgRating.toFixed(1) : '0.0'}</span>
              <span className="text-slate-400">({(product.reviews || []).length} {t('reviews') || 'reviews'})</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight mb-3 font-arabic">
            {getProductName()}
          </h1>

          {/* Price & Savings */}
          <div className="flex items-center gap-3 mb-4">
            {product.discountPrice ? (
              <>
                <span className="text-3xl sm:text-4xl font-black text-candy-700">
                  {formatIQDLabel(Number(product.discountPrice))}
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-400 line-through">
                  {formatIQDLabel(Number(product.price || 0))}
                </span>
                <span className="bg-[#E0F7FA] text-[#00BFA5] border border-[#B2EBF2] font-black text-xs px-2.5 py-1 rounded-md font-arabic">
                  {language === 'ku'
                    ? `داشکانی %${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}`
                    : language === 'ar'
                    ? `خصم %${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}`
                    : `Save ${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}%`}
                </span>
              </>
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-slate-900">
                {formatIQDLabel(Number(product.price || 0))}
              </span>
            )}
          </div>

          {/* Bio Description */}
          <p className="text-slate-600 text-xs sm:text-sm font-bold leading-relaxed mb-6 border-b border-dashed border-slate-200 pb-6">
            {getProductDescription() || 'A timeless favorite crafted with premium quality materials for maximum comfort and durability.'}
          </p>

          {/* Dynamic Color Selection (strictly from product.variations) */}
          {availableColors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                {t('color') || 'SELECT COLOR'}: <span className="text-slate-900 font-bold">{getLocalizedColorName(selectedColor, language)}</span>
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {availableColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 focus:outline-none transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                      selectedColor === color 
                        ? 'border-candy-500 ring-2 ring-candy-500/20 scale-105 shadow-sm' 
                        : 'border-slate-200 hover:scale-102 hover:border-slate-300 bg-white'
                    }`}
                    style={{ backgroundColor: getColorHex(color) }}
                    title={getLocalizedColorName(color, language)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Size Selection (strictly from DB product variations - zero fake fallback) */}
          {(() => {
            const rawProductSizes = (product.variations || [])
              .map(v => v.size)
              .filter((s): s is string => Boolean(s && s.trim().length > 0));
            
            const uniqueProductSizes = Array.from(new Set(rawProductSizes));

            if (uniqueProductSizes.length === 0) return null;

            return (
              <div className="mb-8">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                  {t('selectOutfitSize') || 'SELECT OUTFIT SIZE'}
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {uniqueProductSizes.map((size, idx) => {
                    const isSelected = selectedSize === size || (!selectedSize && idx === 0);

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-full font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-candy-500 text-white shadow-md shadow-candy-500/30 scale-105'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-candy-500'
                        }`}
                      >
                        {getLocalizedSizeName(String(size), language)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Action Section split into 2 distinct rows */}
          <div className="w-full my-6 space-y-3.5">
            
            {/* Row 1: Quantity Selector */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5">
              <span className={`text-sm font-bold text-slate-700 ${isRTL ? 'font-arabic' : ''}`}>
                {language === 'ku' ? 'بڕی داواکراو' : language === 'ar' ? 'الكمية' : 'Quantity'}:
              </span>
              <div className="bg-white border border-slate-200/90 rounded-full px-3 py-1 flex items-center gap-3 font-black text-slate-800 shadow-2xs">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-90 text-lg font-bold"
                >
                  -
                </button>
                <span className="w-6 text-center font-black text-base">{quantity}</span>
                <button 
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-90 text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Row 2: Add to Bag + Wishlist Buttons */}
            <div className="flex items-center gap-3 w-full">
              {/* Add to Playground Bag Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="bg-candy-500 hover:bg-[#FF4D73] text-white font-black h-13 px-6 rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-candy-500/30 active:scale-95 text-sm sm:text-base flex-1 cursor-pointer transition-all"
              >
                {isAddingToCart ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                ) : addedToCart ? (
                  <>
                    <Check className="w-5 h-5 text-white shrink-0" />
                    <span>{t('added') || (language === 'ku' ? 'زیادکرا!' : language === 'ar' ? 'تمت الإضافة!' : 'Added!')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5 text-white shrink-0" />
                    <span>{t('addToPlaygroundBag') || (language === 'ku' ? 'زیادکردن بۆ سەبەتە' : language === 'ar' ? 'إضافة إلى السلة' : 'Add to Bag')}</span>
                  </>
                )}
              </button>

              {/* Wishlist Heart Circle Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`w-13 h-13 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer shrink-0 ${
                  isWishlisted 
                    ? 'bg-candy-500 text-white shadow-candy-500/35' 
                    : 'bg-candy-50 hover:bg-candy-500 text-candy-700 hover:text-white border border-candy-100'
                }`}
                title={isWishlisted ? t('removeFromWishlist') || 'Remove' : t('addToWishlist') || 'Add'}
              >
                <Heart className={`w-5.5 h-5.5 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>
            </div>

            {/* Row 3: Items Added in Cart List (ئایتەمەکانی ناو سەبەتەکە) */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-candy-700 shrink-0" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 font-arabic">
                    {language === 'ku' ? 'ئایتەمەکانی ناو سەبەتەکە:' : language === 'ar' ? 'العناصر في السلة:' : 'Items in Cart:'}
                  </h3>
                  {cart && cart.length > 0 && (
                    <span className="bg-candy-100 text-candy-800 text-[11px] font-black px-2 py-0.5 rounded-full">
                      {cart.reduce((acc, item) => acc + (item?.quantity || 1), 0)}x
                    </span>
                  )}
                </div>
                {cart && cart.length > 0 && (
                  <span className="text-xs sm:text-sm font-black text-emerald-600">
                    {formatIQDLabel(cart.reduce((acc, item) => acc + (Number(item?.product?.discountPrice || item?.product?.price || 0) * (item?.quantity || 1)), 0))}
                  </span>
                )}
              </div>

              {!cart || cart.length === 0 ? (
                <div className="text-center py-3 text-xs font-semibold text-slate-400 font-arabic">
                  {language === 'ku' ? 'هیچ ئایتەمێک لە ناو سەبەتەکەدا نییە' : language === 'ar' ? 'لا توجد عناصر في السلة' : 'No items in cart yet'}
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-slate-200/70">
                  {cart.filter(item => item && item.product).map((item, idx) => {
                    const itemTitle = getItemProductName(item.product);
                    const itemPrice = Number(item.product?.discountPrice || item.product?.price || 0) * item.quantity;

                    return (
                      <div key={item.id || idx} className={`flex items-center gap-3 ${idx > 0 ? 'pt-2.5' : ''}`}>
                        {/* Thumbnail Image (Smaller) */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-white rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs">
                          <img 
                            src={item.product?.imageUrl} 
                            alt={itemTitle} 
                            className="w-full h-full object-cover object-center"
                          />
                        </div>

                        {/* Middle Details (Title, Color • Size • Quantity Badge) */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {itemTitle}
                          </h4>

                          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 font-bold mt-0.5">
                            {item.variation?.color && (
                              <span 
                                className="w-3 h-3 rounded-full border border-slate-300 shrink-0 inline-block shadow-2xs" 
                                style={{ backgroundColor: getColorHex(item.variation.color) }} 
                                title={getLocalizedColorName(item.variation.color, language)}
                              />
                            )}
                            <span className="font-bold text-slate-800">
                              {getLocalizedColorName(item.variation?.color || '', language)}
                            </span>
                            {item.variation?.color && item.variation?.size && <span className="text-slate-400 font-bold">•</span>}
                            <span className="font-extrabold text-slate-900">
                              {getLocalizedSizeName(String(item.variation?.size || ''), language)}
                            </span>
                            <span className="text-slate-300 font-bold">•</span>
                            <span className="font-black text-candy-700 bg-candy-50 border border-candy-100/80 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px]">
                              {item.quantity}x
                            </span>
                          </div>
                        </div>

                        {/* Price & Delete Button (Trash Icon Only) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {formatIQDLabel(itemPrice)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-candy-700 hover:text-candy-800 hover:bg-candy-50 rounded-lg transition-all cursor-pointer active:scale-90"
                            title={language === 'ku' ? 'سڕینەوە' : language === 'ar' ? 'حذف' : 'Remove'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Checkout / Complete Order Button */}
              {cart && cart.length > 0 && (
                <div className="pt-3 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-sm sm:text-base rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-arabic"
                  >
                    <span>
                      {language === 'ku'
                        ? 'تەواوکردنی داواکاری (چێک ئاوت)'
                        : language === 'ar'
                        ? 'إتمام الطلب (الدفع)'
                        : 'Proceed to Checkout'}
                    </span>
                    {isRTL ? <ArrowLeft className="w-4 h-4 shrink-0" /> : <ArrowRight className="w-4 h-4 shrink-0" />}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* The four promises, last in the column — under the buy button and
              the basket. They answer what a parent asks once they have already
              decided ("how does it reach me, can I send it back"), so they sit
              better after the controls than in front of them. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-bubble-50 border border-bubble-200 rounded-2xl p-4">
            {([
              { icon: 'truck',  label: language === 'ku' ? 'گەیاندن بۆ هەموو پارێزگاکان' : language === 'ar' ? 'توصيل لكل المحافظات' : 'Delivery nationwide' },
              { icon: 'cash',   label: language === 'ku' ? 'پارەدان لە کاتی وەرگرتن' : language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on delivery' },
              { icon: 'return', label: language === 'ku' ? 'گەڕاندنەوە تا ١٤ ڕۆژ' : language === 'ar' ? 'إرجاع خلال 14 يوم' : 'Returns within 14 days' },
              { icon: 'fabric', label: language === 'ku' ? 'پارچەی سروشتی و پێستپارێز' : language === 'ar' ? 'أقمشة طبيعية آمنة' : 'Natural, skin-safe fabric' },
            ] as { icon: KidsIconName; label: string }[]).map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                <KidsIcon name={icon} className="w-5 h-5 shrink-0" />
                {label}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16 border-t border-slate-200 pt-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">{t('customerReviews')}</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Reviews List */}
          <div className="lg:col-span-7 space-y-8">
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-200 pb-8 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-semibold text-slate-900">{review.author}</h4>
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> {t('verifiedPurchase') || 'Verified Purchase'}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-200 text-slate-200'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                  {review.imageUrl && (
                    <div className="mt-4">
                      <img src={review.imageUrl} alt="Review attachment" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic">{t('noReviewsYet')}</p>
            )}
          </div>
          
          {/* Write a Review */}
          <div className="lg:col-span-5">
            <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">{t('writeReview')}</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label htmlFor="author" className="block text-sm font-medium text-slate-700 mb-1">{t('yourName')}</label>
                  <input 
                    type="text" 
                    id="author" 
                    required 
                    value={reviewForm.author}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('rating')}</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <Star className={`w-6 h-6 ${star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-1">{t('yourReview')}</label>
                  <textarea 
                    id="comment" 
                    required 
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" 
                  />
                </div>
                <div>
                  <label htmlFor="photo" className="block text-sm font-medium text-slate-700 mb-1">Add a Photo (optional)</label>
                  <input 
                    type="file" 
                    id="photo" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-grape-50 file:text-indigo-700 hover:file:bg-grape-100"
                  />
                  {reviewForm.imageUrl && (
                    <div className="mt-2">
                      <img src={reviewForm.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-md border border-slate-200" />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center rounded-lg border border-transparent bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
                >
                  {t('submitReview')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <div className="mt-12 sm:mt-16 border-t border-slate-200 pt-12 font-arabic">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-black text-candy-700 uppercase tracking-wider block mb-1">
                {language === 'ku' ? 'زیاتر ببینە' : language === 'ar' ? 'اكتشف المزيد' : 'Discover More'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                {language === 'ku' ? 'بەرهەمی هاوشێوە' : language === 'ar' ? 'منتجات مشابهة' : 'Related Products'}
              </h2>
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  if (relatedScrollRef.current) relatedScrollRef.current.scrollBy({ left: -260, behavior: 'smooth' });
                }}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-candy-500 hover:text-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
                aria-label="Previous related products"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (relatedScrollRef.current) relatedScrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
                }}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-candy-500 hover:text-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
                aria-label="Next related products"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          </div>

          <div ref={relatedScrollRef} className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
            {relatedProducts.map(relProduct => (
              <div key={relProduct.id} className="w-[220px] min-w-[220px] sm:w-[250px] sm:min-w-[250px] shrink-0 snap-start">
                <ProductCard product={relProduct} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Modal Lightbox */}
      {createPortal(
        <AnimatePresence>
          {isPreviewGalleryOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsPreviewGalleryOpen(false)}
              className="fixed inset-0 top-0 left-0 w-screen h-[100dvh] z-[99999] flex flex-col justify-between bg-black/95 p-3 sm:p-6 overflow-hidden select-none"
            >
              {/* Top Bar: Counter & Close Button */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="w-full flex items-center justify-between text-white z-20 shrink-0 pt-2 px-2"
              >
                <div className="text-xs font-extrabold bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                  {allImages.indexOf(activeImage) + 1} / {allImages.length}
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPreviewGalleryOpen(false)}
                  className="w-10 h-10 bg-white/15 hover:bg-white/25 text-white rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 border border-white/20"
                  aria-label="Close Gallery"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Main Image Container */}
              <motion.div 
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative flex-1 w-full max-w-4xl mx-auto flex items-center justify-center my-auto px-2 py-1 overflow-hidden select-none touch-pan-y"
              >
                <img 
                  src={activeImage} 
                  alt={getProductName()} 
                  className="max-w-full max-h-[60dvh] sm:max-h-[72dvh] object-contain rounded-2xl shadow-2xl"
                />

                {/* Prev / Next Modal Arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const currIdx = allImages.indexOf(activeImage);
                        const prevIdx = (currIdx - 1 + allImages.length) % allImages.length;
                        setActiveImage(allImages[prevIdx]);
                      }}
                      className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer active:scale-90"
                      aria-label="Previous Image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currIdx = allImages.indexOf(activeImage);
                        const nextIdx = (currIdx + 1) % allImages.length;
                        setActiveImage(allImages[nextIdx]);
                      }}
                      className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer active:scale-90"
                      aria-label="Next Image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </motion.div>

              {/* Bottom Thumbnails Strip */}
              {allImages.length > 1 && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 overflow-x-auto max-w-full py-2 shrink-0 scrollbar-hide z-20"
                >
                  {allImages.map((img, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeImage === img ? 'border-candy-500 scale-105 shadow-md' : 'border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};
