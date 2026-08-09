import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, ShoppingBag, Truck, RefreshCcw, Heart, Star, Loader2, Check, X, Trash2, CheckCircle, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { whatsappLink, shareOnWhatsApp } from '../utils/whatsapp';
import { ProductVariation } from '../types';
import { ProductDetailSkeleton } from '../components/ProductDetailSkeleton';
import { ProductCard } from '../components/ProductCard';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, categories, addToCart, wishlist, toggleWishlist, addReview, recordRecentlyViewed } = useStore();
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
        <button onClick={() => navigate(-1)} className="text-indigo-600 font-medium hover:text-indigo-700">
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
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10 font-arabic">
      
      {/* Breadcrumb Navigation */}
      <Link to="/products" className="inline-flex items-center text-xs font-black text-slate-500 hover:text-[#FF6584] mb-6 transition-colors">
        <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-1.5 rotate-180' : 'mr-1.5'}`} /> {t('backToProducts')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Pastel Image Frame & Thumbnails (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div 
            onClick={() => setIsPreviewGalleryOpen(true)}
            className="aspect-square bg-[#E0F2FE] rounded-3xl overflow-hidden border border-sky-100/60 shadow-xs relative cursor-zoom-in group/mainimg p-4 sm:p-6 flex items-center justify-center"
          >
            <img 
              src={activeImage} 
              alt={getProductName()} 
              className="w-full h-full object-contain object-center group-hover/mainimg:scale-105 transition-transform duration-500"
            />

            {/* Sale Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-[#FF6584] text-white text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {product.discountPrice ? `SALE -${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}%` : 'HOT'}
              </span>
            </div>

            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/mainimg:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="bg-white/90 backdrop-blur-md text-slate-800 text-xs font-black px-4 py-2 rounded-full shadow-lg">Click to Enlarge Gallery</span>
            </div>
          </div>

          {/* Thumbnails Gallery Strip */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white ${
                    activeImage === img 
                      ? 'border-[#FF6584] ring-2 ring-[#FF6584]/20 scale-105 shadow-md' 
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
            <span className="text-xs font-black text-[#FF6584] uppercase tracking-wider">
              {(product as any).categoryName || (language === 'ku' ? 'چاکەت و کراس' : 'JACKET')}
            </span>
            
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-full px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
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
                <span className="text-3xl sm:text-4xl font-black text-[#FF6584]">
                  {formatIQDLabel(Number(product.discountPrice))}
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-400 line-through">
                  {formatIQDLabel(Number(product.price || 0))}
                </span>
                <span className="bg-[#E0F7FA] text-[#00BFA5] border border-[#B2EBF2] font-black text-xs px-2.5 py-1 rounded-md">
                  Save {Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}%
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
                        ? 'border-[#FF6584] ring-2 ring-[#FF6584]/20 scale-105 shadow-sm' 
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
                            ? 'bg-[#FF6584] text-white shadow-md shadow-rose-500/20 scale-105'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-[#FF6584]'
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

          {/* Action Bar: Quantity Counter + Add to Playground Bag + Wishlist Heart */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 flex-wrap sm:flex-nowrap">
            
            {/* Quantity Counter */}
            <div className="bg-slate-100 border border-slate-200 rounded-full px-3.5 py-2 flex items-center gap-4 font-black text-sm text-slate-800">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-6 h-6 rounded-full hover:bg-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                -
              </button>
              <span className="w-4 text-center font-extrabold">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-6 h-6 rounded-full hover:bg-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Add to Playground Bag Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="bg-[#FF6584] hover:bg-[#FF4D73] text-white font-black px-8 py-3.5 rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/20 active:scale-95 text-xs sm:text-sm flex-grow cursor-pointer transition-all"
            >
              {isAddingToCart ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : addedToCart ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>{t('added') || 'Added to Bag!'}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4.5 h-4.5 text-white" />
                  <span>{t('addToPlaygroundBag') || 'Add to Playground Bag'}</span>
                </>
              )}
            </button>

            {/* Wishlist Heart Circle Button */}
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer shrink-0 ${
                isWishlisted 
                  ? 'bg-[#FF6584] text-white shadow-rose-500/30' 
                  : 'bg-rose-50 hover:bg-[#FF6584] text-[#FF6584] hover:text-white'
              }`}
              title={isWishlisted ? t('removeFromWishlist') || 'Remove' : t('addToWishlist') || 'Add'}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white' : ''}`} />
            </button>

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
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
              <span className="text-xs font-black text-[#FF6584] uppercase tracking-wider block mb-1">
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
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
                aria-label="Previous related products"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (relatedScrollRef.current) relatedScrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
                }}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
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

      {/* Gallery Modal */}
      {isPreviewGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button 
            onClick={() => setIsPreviewGalleryOpen(false)}
            className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all focus:outline-none"
            aria-label="Close Gallery"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-full max-w-5xl flex flex-col items-center gap-6">
            <div className="w-full max-h-[70vh] flex items-center justify-center">
              <img 
                src={activeImage} 
                alt={product.name} 
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto max-w-full pb-2 shrink-0 hide-scrollbar">
                {allImages.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${activeImage === img ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
