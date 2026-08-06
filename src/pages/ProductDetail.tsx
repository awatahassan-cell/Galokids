import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, ShoppingBag, Truck, RefreshCcw, Heart, Star, Loader2, Check, X, Trash2, CheckCircle, Share2 } from 'lucide-react';
import { whatsappLink, shareOnWhatsApp } from '../utils/whatsapp';
import { ProductVariation } from '../types';
import { ProductDetailSkeleton } from '../components/ProductDetailSkeleton';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, wishlist, toggleWishlist, addReview, recordRecentlyViewed } = useStore();
  const { t, language, dir } = useLanguage();
  const isRTL = dir === 'rtl' || language === 'ku' || language === 'ar';
  const [isLoading, setIsLoading] = useState(true);

  const product = products.find(p => p?.id === id);

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
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
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
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Link to="/products" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors">
        <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} /> {t('backToProducts')}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div 
            onClick={() => setIsPreviewGalleryOpen(true)}
            className="aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative cursor-zoom-in group/mainimg"
          >
            <img 
              src={activeImage} 
              alt={product.name} 
              className="w-full h-full object-cover object-center group-hover/mainimg:scale-102 transition-transform duration-300"
            />
            {(!selectedVariation || selectedVariation.stockQuantity === 0) && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                {t('outOfStock')}
              </div>
            )}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/mainimg:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-white/90 backdrop-blur-xs text-slate-800 text-xs font-bold px-4 py-2 rounded-full shadow-lg">Click to Enlarge Gallery</span>
            </div>
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {allImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-1 scale-105 shadow-md' : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'}`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold text-indigo-600 tracking-wide uppercase">
              {t('barcode') || 'Barcode'}: {product.barcode}
            </p>
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`p-2 rounded-full border transition-colors ${
                isWishlisted 
                  ? 'border-red-200 bg-red-50 text-red-500' 
                  : 'border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500' : ''}`} />
            </button>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-display text-slate-900 tracking-tight mb-4 leading-tight">
            {getProductName()}
          </h1>
          
          {avgRating > 0 && (
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-200 text-slate-200'}`} 
                />
              ))}
              <span className="text-sm text-slate-700 font-bold ml-2">{avgRating}</span>
              <span className="text-sm text-slate-500 ml-1">({product.reviews?.length} reviews)</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 mb-6">
            {product.discountPrice ? (
              <>
                <p className="text-3xl font-bold font-display text-rose-500">
                  {formatIQDLabel(Number(product.discountPrice))}
                </p>
                <p className="text-xl font-medium text-slate-400 line-through">
                  {formatIQDLabel(Number(product.price || 0))}
                </p>
                <span className="bg-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  {t('sale') || 'Sale'}
                </span>
              </>
            ) : (
              <p className="text-3xl font-bold font-display text-slate-900">
                {formatIQDLabel(Number(product.price || 0))}
              </p>
            )}
          </div>
          <p className="text-slate-600 text-base leading-relaxed mb-8 whitespace-pre-wrap">
            {getProductDescription()}
          </p>

          <div className="h-px bg-slate-200 mb-8 w-full" />

          <div className="h-px bg-slate-200 mb-8 w-full" />

          {/* Color Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>{t('color')}:</span>
              {selectedColor ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700 capitalize">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: getColorHex(selectedColor) }} />
                  {selectedColor}
                </span>
              ) : (
                <span className="text-slate-400 font-normal text-xs">{t('chooseColorOption') || 'Choose color option'}</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {availableColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    // Reset size if not applicable for new color
                    const designSizes = (product.variations || [])
                      .filter(v => v.color === color)
                      .map(v => v.size);
                    if (!designSizes.includes(selectedSize)) {
                      setSelectedSize(designSizes[0] || '');
                    }
                  }}
                  className={`w-11 h-10 rounded-full border-2 focus:outline-none transition-all flex items-center justify-center shrink-0 ${
                    selectedColor === color 
                      ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-sm' 
                      : 'border-slate-200 hover:scale-102 hover:border-slate-300 bg-white'
                  }`}
                  style={{ backgroundColor: getColorHex(color) }}
                  title={color}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>{t('size')}:</span>
              {selectedSize ? (
                <span className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700 uppercase">
                  {selectedSize}
                </span>
              ) : (
                <span className="text-slate-400 font-normal text-xs">{t('chooseSizeOption') || 'Choose size option'}</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {availableSizes.map(size => {
                const varObj = (product.variations || []).find(v => v.color === selectedColor && v.size === size);
                const isOutOfStock = !varObj || varObj.stockQuantity === 0;

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-14 px-4 py-2 text-xs font-bold rounded-xl border focus:outline-none transition-all ${
                      selectedSize === size
                        ? 'bg-slate-950 text-white border-slate-950'
                        : isOutOfStock
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed line-through'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {size}
                    {varObj && varObj.stockQuantity > 0 && varObj.stockQuantity < 10 && (
                      <span className="ml-1 text-[10px] text-red-500 font-extrabold font-mono">({varObj.stockQuantity})</span>
                    )}
                  </button>
                );
              })}
              {availableSizes.length === 0 && (
                <p className="text-xs text-red-500 italic font-medium">{t('selectColorToSeeSizes') || 'Please select a color option to see available sizes.'}</p>
              )}
            </div>
          </div>

          {/* Actions & Selections List */}
          <div className="mt-auto pt-4 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-900 font-bold"
                  disabled={!selectedVariation || quantity <= 1}
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-black text-slate-900">
                  {quantity}
                </span>
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.min(selectedVariation?.stockQuantity || 1, quantity + 1))}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-900 font-bold"
                  disabled={!selectedVariation || quantity >= (selectedVariation?.stockQuantity || 1)}
                >
                  +
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleQueueVariation}
                disabled={!selectedVariation || selectedVariation.stockQuantity === 0}
                className={`flex-1 py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                  selectedVariation && selectedVariation.stockQuantity > 0
                    ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:scale-95'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                }`}
              >
                {t('addVariation')}
              </button>
            </div>

            {/* Selected Queue Summary */}
            {queuedVariants.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  {t('queuedVariations')} ({queuedVariants.reduce((sum, item) => sum + item.quantity, 0)}{language === 'en' ? ' items' : ''})
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {queuedVariants.map((item) => (
                    <div key={item.variation.id} className="flex justify-between items-center p-2.5 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: getColorHex(item.variation.color) }} />
                        <span className="text-xs font-bold text-slate-800 capitalize">{item.variation.color} / {item.variation.size}</span>
                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">× {item.quantity}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveQueued(item.variation.id)}
                        className="text-slate-300 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={(!selectedVariation || selectedVariation.stockQuantity === 0) && queuedVariants.length === 0 || isAddingToCart}
              className={`w-full flex items-center justify-center py-4 rounded-full text-base font-bold text-white transition-all shadow-md ${
                (queuedVariants.length > 0 || (selectedVariation && selectedVariation.stockQuantity > 0)) && !isAddingToCart
                  ? 'bg-amber-900 hover:bg-amber-800 active:scale-[0.99]'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {isAddingToCart ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : addedToCart ? (
                <Check className="w-5 h-5 mr-2" />
              ) : (
                <ShoppingBag className="w-5 h-5 mr-2" />
              )}
              {isAddingToCart 
                ? t('loading') 
                : addedToCart 
                  ? t('added') 
                  : queuedVariants.length > 0
                    ? `${t('addAllQueuedToCart')} (${queuedVariants.reduce((sum, item) => sum + item.quantity, 0)})`
                    : t('addToCart') || 'Add to Cart'}
            </button>

            {/* Order / share via WhatsApp */}
            <div className="mt-3 flex gap-3">
              <a
                href={whatsappLink(
                  `${language === 'ku' ? 'ده‌مه‌وێت ئه‌مه‌ بكڕم' : language === 'ar' ? 'أريد شراء هذا' : "I'd like to order this"}: ${getProductName()} — ${window.location.href}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl hover:brightness-95 transition-all"
              >
                <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current"><path d="M16 0C7.2 0 0 7.2 0 16c0 3.5 1.1 6.7 3 9.4L1 32l6.8-2C10.4 31.3 13.1 32 16 32c8.8 0 16-7.2 16-16S24.8 0 16 0zm9.3 22.6c-.4 1.1-1.9 2-3.1 2.3-.8.2-1.9.3-5.6-1.2-4.7-1.9-7.7-6.7-8-7-.2-.3-1.9-2.5-1.9-4.8s1.2-3.4 1.6-3.9c.4-.4.8-.6 1.3-.6h.4c.4 0 .6 0 .8.6.3.8 1.1 2.7 1.2 2.8.1.2.2.4 0 .7-.1.3-.2.4-.4.6l-.6.6c-.2.2-.4.4-.2.8s1 1.6 2.1 2.6c1.4 1.3 2.6 1.7 3 1.8.3.1.7.1.9-.2.3-.3.6-.8 1-1.3.3-.4.6-.4.9-.3.4.1 2.2 1 2.5 1.2.4.2.6.3.7.4.1.2.1.9-.3 2z"/></svg>
                {t('orderOnWhatsApp') || 'Order on WhatsApp'}
              </a>
              <button
                onClick={() => {
                  const shareText = `${getProductName()} — ${window.location.href}`;
                  if (navigator.share) {
                    navigator.share({ title: getProductName(), url: window.location.href }).catch(() => {});
                  } else {
                    window.open(shareOnWhatsApp(shareText), '_blank');
                  }
                }}
                title={t('share') || 'Share'}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
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
