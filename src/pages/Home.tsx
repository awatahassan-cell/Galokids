import React, { useState, useRef, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { PromoBanner } from '../components/PromoBanner';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { CategoryIcon } from '../components/CategoryIcon';
import { CountdownBanner } from '../components/CountdownBanner';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Product } from '../types';
import { motion } from 'motion/react';

const cardWidth = 'w-[220px] min-w-[220px] max-w-[220px] sm:w-[250px] sm:min-w-[250px] sm:max-w-[250px] flex-shrink-0 snap-start';

const ProductRow: React.FC<{
  title: string;
  subtitle?: string;
  titleClass?: string;
  linkTo?: string;
  isLoading: boolean;
  products: Product[];
  shopAllLabel: string;
}> = ({ title, subtitle, titleClass, linkTo, isLoading, products, shopAllLabel }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  if (!isLoading && products.length === 0) return null;

  const handleScroll = (dir: 'left' | 'right') => {
    if (rowRef.current) {
      const amount = dir === 'left' ? -300 : 300;
      rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 sm:mb-12 font-arabic relative group/row"
    >
      <div className="px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 flex items-end justify-between gap-2">
        <div>
          <h2 className={`text-xl sm:text-3xl font-black tracking-tight ${titleClass || 'text-slate-900'}`}>{title}</h2>
          {subtitle && <p className="text-slate-500 text-xs sm:text-sm font-bold mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleScroll('left')}
            className="w-8 h-8 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <button 
            onClick={() => handleScroll('right')}
            className="w-8 h-8 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
          {linkTo && (
            <Link to={linkTo} className="inline-flex items-center text-xs font-black text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 px-3.5 py-1.5 rounded-full transition-all shrink-0 active:scale-95 ml-2">
              {shopAllLabel} <ArrowRight className="w-3.5 h-3.5 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180" />
            </Link>
          )}
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div ref={rowRef} className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
          {isLoading
            ? [1, 2, 3, 4, 5, 6].map(i => <div key={i} className={cardWidth}><ProductCardSkeleton /></div>)
            : products.map((product, index) => (
                <motion.div 
                  key={product.id} 
                  className={cardWidth}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
        </div>
      </div>
    </motion.div>
  );
};

export const Home: React.FC = () => {
  const { products, categories, reviews, fetchBestSellers, getRecentlyViewedIds, isProductsLoading } = useStore();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [activeProductTab, setActiveProductTab] = useState<'featured' | 'trending' | 'new'>('featured');

  const featuredProducts = products.length > 0 ? [...products].reverse().slice(0, 10) : [];
  const activeProductsList = React.useMemo(() => {
    if (activeProductTab === 'trending') return bestSellers.length > 0 ? bestSellers : products.slice(0, 8);
    if (activeProductTab === 'new') return products.slice(0, 8);
    return featuredProducts;
  }, [activeProductTab, bestSellers, products, featuredProducts]);
  const boysSpecific = products.filter(p => Number(p.gender) === 1);
  const boysProducts = boysSpecific.length > 0 ? boysSpecific.slice(0, 10) : products.slice(0, 10);

  const girlsSpecific = products.filter(p => Number(p.gender) === 2);
  const girlsProducts = girlsSpecific.length > 0 ? girlsSpecific.slice(0, 10) : products.slice(0, 10);

  const recentlyViewed = React.useMemo(() => {
    const ids = getRecentlyViewedIds();
    return ids.map(id => products.find(p => String(p.id) === String(id))).filter(Boolean) as Product[];
  }, [products, getRecentlyViewedIds]);

  const topReviews = React.useMemo(
    () => (reviews || []).filter(r => r.verifiedPurchase && r.comment).slice(0, 8),
    [reviews]
  );

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const promoScrollRef = useRef<HTMLDivElement>(null);
  const discoverScrollRef = useRef<HTMLDivElement>(null);

  const getCategoryName = (c: any) => (language === 'ku' && c.nameKu) ? c.nameKu : (language === 'ar' && c.nameAr) ? c.nameAr : c.name;

  useEffect(() => {
    setIsLoading(false);
    fetchBestSellers(10).then(setBestSellers).catch(() => {});
  }, [fetchBestSellers]);

  const handleRefScroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (ref.current) {
      const amount = dir === 'left' ? -340 : 340;
      ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-grow font-arabic"
    >
      <div className="max-w-7xl mx-auto">
        <CountdownBanner />
        
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Shop by Category Carousel Section */}
        {categories.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 font-arabic relative group/cat"
          >
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <span className="inline-block bg-rose-50 border border-rose-200/80 text-rose-500 font-bold text-xs px-4 py-1.5 rounded-full mb-2 shadow-2xs">
                  ✨ {language === 'ku' ? 'کۆکراوە هەڵبژێردراوەکان' : language === 'ar' ? 'تشكيلات ممتازة' : 'Curated Collections'}
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {language === 'ku' ? (
                    <>
                      گەڕان بەپێی <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">پۆلەکان</span>
                    </>
                  ) : language === 'ar' ? (
                    <>
                      تسوق حسب <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">الأقسام</span>
                    </>
                  ) : (
                    <>
                      Shop by <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">Category</span>
                    </>
                  )}
                </h2>
              </div>

              {/* Carousel Navigation Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => handleRefScroll(categoryScrollRef, 'left')}
                  className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                  aria-label="Previous Categories"
                >
                  <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <button 
                  onClick={() => handleRefScroll(categoryScrollRef, 'right')}
                  className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                  aria-label="Next Categories"
                >
                  <ChevronRight className="w-5 h-5 rtl:rotate-180" />
                </button>
              </div>
            </div>

            {/* Scrollable Category Horizontal Cards Carousel */}
            <div ref={categoryScrollRef} className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
              {categories.map((c, idx) => {
                const colorAccents = [
                  { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-800 border-amber-200', btn: 'group-hover:bg-amber-500 text-amber-600', ring: 'border-amber-100 bg-amber-50/60' },
                  { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', btn: 'group-hover:bg-rose-500 text-rose-600', ring: 'border-rose-100 bg-rose-50/60' },
                  { bar: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-200', btn: 'group-hover:bg-sky-500 text-sky-600', ring: 'border-sky-100 bg-sky-50/60' },
                  { bar: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', btn: 'group-hover:bg-purple-500 text-purple-600', ring: 'border-purple-100 bg-purple-50/60' },
                ];
                const theme = colorAccents[idx % colorAccents.length];
                const categoryNameStr = getCategoryName(c);

                return (
                  <motion.div key={c.id} whileHover={{ y: -6 }} transition={{ duration: 0.3 }} className="w-[200px] min-w-[200px] sm:w-[240px] sm:min-w-[240px] shrink-0 snap-start">
                    <Link
                      to={`/products?category=${encodeURIComponent(c.slug || c.name)}`}
                      className="group relative flex flex-col items-center text-center bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full"
                    >
                      <div className={`absolute top-0 inset-x-0 h-2 ${theme.bar}`} />
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 ${theme.ring} shadow-md overflow-hidden flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt={categoryNameStr} className="w-full h-full object-cover object-center" />
                        ) : (
                          <CategoryIcon name={c.icon || c.name} className="w-9 h-9 sm:w-11 sm:h-11 text-slate-700" />
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-500 transition-colors leading-tight mb-4">
                        {categoryNameStr}
                      </h3>
                      <div className={`w-full mt-auto py-2 rounded-2xl bg-slate-100 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs group-hover:text-white ${theme.btn}`}>
                        <span>{language === 'ku' ? 'بینینی کاڵاکان' : language === 'ar' ? 'عرض المنتجات' : 'View Products'}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* 3. Dressed to Play & Shine Carousel Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 font-arabic relative group/promo"
        >
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <span className="inline-block bg-amber-50 border border-amber-200/80 text-amber-600 font-bold text-xs px-4 py-1.5 rounded-full mb-2 shadow-2xs">
                🔥 {language === 'ku' ? 'داشکاندنی تایبەت' : language === 'ar' ? 'عروض لفترة محددة' : 'Limited Time Deals'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {language === 'ku' ? (
                  <>
                    پۆشاک بۆ <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">یاری و درەوشانەوە</span>
                  </>
                ) : language === 'ar' ? (
                  <>
                    أنشط الملابس لأجل <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">اللعب والتألق</span>
                  </>
                ) : (
                  <>
                    Dressed to <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">Play & Shine</span>
                  </>
                )}
              </h2>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => handleRefScroll(promoScrollRef, 'left')}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                aria-label="Previous Deals"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button 
                onClick={() => handleRefScroll(promoScrollRef, 'right')}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                aria-label="Next Deals"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          </div>

          <div ref={promoScrollRef} className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
            
            {/* Boys Promo Card */}
            <div className="w-[320px] min-w-[320px] sm:w-[480px] sm:min-w-[480px] shrink-0 snap-start group relative rounded-3xl overflow-hidden shadow-lg border border-slate-100 bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-700 p-6 sm:p-8 text-white flex flex-col justify-between h-[320px] sm:h-[360px]">
              <img 
                src="https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&q=80&w=800" 
                alt="Boys Collection" 
                className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 right-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-slate-900 font-black flex flex-col items-center justify-center text-center shadow-xl transform rotate-12 animate-pulse">
                <span className="text-[9px] uppercase">UP TO</span>
                <span className="text-base sm:text-xl leading-none">30%</span>
                <span className="text-[9px] uppercase">OFF</span>
              </div>
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black mb-3 border border-white/30">
                  ⚡ {language === 'ku' ? 'یاری و جووڵە' : language === 'ar' ? 'نشاط ولعب' : 'Playground Active'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
                  {language === 'ku' ? 'مۆدێلی شیک بۆ کوڕانی بچووک' : language === 'ar' ? 'تصاميم رائعة للأولاد الصغار' : 'Cool Styles For Little Boys'}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-sky-100 max-w-sm mb-4">
                  {language === 'ku' ? 'پۆشاکی لۆکەیی خۆڕاگر بۆ یاری و ڕاکردنی ڕۆژانە.' : language === 'ar' ? 'ملابس قطنية متينة مصممة للمتعة المستمرة.' : 'Durable denim & soft cotton tees built for non-stop fun.'}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 text-[11px] font-bold">
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full">✓ 100% Cotton</span>
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full">✓ Washable</span>
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full">✓ Stretchable</span>
                </div>
              </div>
              <div className="relative z-10">
                <Link to="/products?gender=1" className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-rose-500 hover:text-white px-6 py-2.5 rounded-full font-black text-xs transition-all shadow-md active:scale-95">
                  <span>{language === 'ku' ? 'سەیری کوڕان بکە' : language === 'ar' ? 'استكشف الأولاد' : 'Explore Boys'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            </div>

            {/* Girls Promo Card */}
            <div className="w-[320px] min-w-[320px] sm:w-[480px] sm:min-w-[480px] shrink-0 snap-start group relative rounded-3xl overflow-hidden shadow-lg border border-slate-100 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 p-6 sm:p-8 text-white flex flex-col justify-between h-[320px] sm:h-[360px]">
              <img 
                src="https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&q=80&w=800" 
                alt="Girls Collection" 
                className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 right-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-slate-900 font-black flex flex-col items-center justify-center text-center shadow-xl transform rotate-12 animate-pulse">
                <span className="text-[9px] uppercase">UP TO</span>
                <span className="text-base sm:text-xl leading-none">40%</span>
                <span className="text-[9px] uppercase">OFF</span>
              </div>
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black mb-3 border border-white/30">
                  ✨ {language === 'ku' ? 'شایستەی ئاهەنگ' : language === 'ar' ? 'للحفلات' : 'Party Ready'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
                  {language === 'ku' ? 'سحر و جوانی بۆ کچانی جوان' : language === 'ar' ? 'سحر أنيق للبنات الجميلات' : 'Bright Magic For Happy Girls'}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-pink-100 max-w-sm mb-4">
                  {language === 'ku' ? 'فستان و پۆشاکی نازدار بۆ کەشوهەوای خۆشی و شادی.' : language === 'ar' ? 'فساتين ساحرة وملابس رائعة للأوقات السعيدة.' : 'Pretty dresses & cheerful outfits for bright happy moments.'}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 text-[11px] font-bold">
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full">✓ Soft Fabric</span>
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full">✓ Non-scratch</span>
                  <span className="bg-white/15 px-2.5 py-0.5 rounded-full">✓ Vibrant</span>
                </div>
              </div>
              <div className="relative z-10">
                <Link to="/products?gender=2" className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-rose-500 hover:text-white px-6 py-2.5 rounded-full font-black text-xs transition-all shadow-md active:scale-95">
                  <span>{language === 'ku' ? 'سەیری کچان بکە' : language === 'ar' ? 'استكشف البنات' : 'Explore Girls'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            </div>

          </div>
        </motion.section>

        {/* 4. Discover Our New Outfits Tabbed Products Carousel Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden bg-gradient-to-b from-sky-50/50 via-pink-50/30 to-white py-10 sm:py-16 px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 font-arabic rounded-3xl border border-pink-100/60 shadow-xs mx-2 sm:mx-6 lg:mx-8"
        >
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-rose-200/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

          <div className="relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
              <span className="inline-block bg-sky-50 border border-sky-200/80 text-sky-600 font-bold text-xs px-4 py-1.5 rounded-full mb-3 shadow-2xs">
                🎈 {language === 'ku' ? 'هەڵبژێردراوی منداڵان' : language === 'ar' ? 'معتمد للأطفال' : 'Playground Approved'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                {language === 'ku' ? (
                  <>
                    نوێترین پۆشاکەکان <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">کەشف بکە</span>
                  </>
                ) : language === 'ar' ? (
                  <>
                    اكتشف أحدث <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">الملابس للأطفال</span>
                  </>
                ) : (
                  <>
                    Discover Our <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">New Outfits</span>
                  </>
                )}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-6">
                {language === 'ku' 
                  ? 'پۆشاکی نەرن، ڕەنگاوڕەنگ و خۆڕاگر بۆ منداڵە چالاک و خۆشەویستەکانمان.' 
                  : language === 'ar'
                  ? 'تصاميم مريحة ومقاومة ومبهجة لأطفالنا الصغار النشيطين.'
                  : 'Soft, vibrant & durable styles made for active little explorers.'}
              </p>

              {/* Vastraa Tab Filter Buttons */}
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={() => setActiveProductTab('featured')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    activeProductTab === 'featured'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  <span>⭐</span>
                  <span>{language === 'ku' ? 'تایبەت' : language === 'ar' ? 'المميزة' : 'Featured'}</span>
                </button>

                <button
                  onClick={() => setActiveProductTab('trending')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    activeProductTab === 'trending'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  <span>🔥</span>
                  <span>{language === 'ku' ? 'باوترین' : language === 'ar' ? 'الرائج' : 'Trending'}</span>
                </button>

                <button
                  onClick={() => setActiveProductTab('new')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    activeProductTab === 'new'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  <span>⚡</span>
                  <span>{language === 'ku' ? 'نوێترین' : language === 'ar' ? 'جديدنا' : 'New Arrival'}</span>
                </button>
              </div>
            </div>

            {/* Carousel Arrow Controls */}
            <div className="flex justify-end gap-2 mb-4">
              <button 
                onClick={() => handleRefScroll(discoverScrollRef, 'left')}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                aria-label="Previous Products"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button 
                onClick={() => handleRefScroll(discoverScrollRef, 'right')}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-[#FF6584] hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                aria-label="Next Products"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>

            {/* Discover Outfits Horizontal Products Carousel */}
            <div ref={discoverScrollRef} className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
              {isLoading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="w-[220px] min-w-[220px] sm:w-[250px] sm:min-w-[250px] shrink-0 snap-start"><ProductCardSkeleton /></div>)
              ) : (
                activeProductsList.map((product) => (
                  <div key={product.id} className="w-[220px] min-w-[220px] sm:w-[250px] sm:min-w-[250px] shrink-0 snap-start">
                    <ProductCard product={product} />
                  </div>
                ))
              )}
            </div>

            {/* Bottom View All CTA */}
            <div className="text-center mt-8 sm:mt-10">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm font-black text-white bg-slate-900 hover:bg-rose-500 transition-all shadow-md active:scale-95"
              >
                <span>{language === 'ku' ? 'بینینی سەرجەم بەرهەمەکان' : language === 'ar' ? 'عرض جميع المنتجات' : 'View All Products'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </motion.section>



        {/* 6. Social Proof / Customer Reviews Section */}
        {topReviews.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 font-arabic">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="inline-block bg-rose-50 border border-rose-200/80 text-rose-500 font-bold text-xs px-4 py-1.5 rounded-full mb-2 shadow-2xs">
                💖 LOVE & REVIEWS
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                What Our <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">Customers Say</span>
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-4">
              {topReviews.map(r => (
                <div key={r.id} className="min-w-[280px] max-w-[280px] bg-white rounded-3xl border border-slate-100 shadow-sm p-5 snap-start">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className={s <= r.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 font-bold leading-relaxed line-clamp-4 mb-3">“{r.comment}”</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-black text-slate-800">{r.author}</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. Instagram Feed Strip */}
        <section className="px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 font-arabic text-center">
          <span className="inline-block bg-pink-50 border border-pink-200/80 text-pink-600 font-bold text-xs px-4 py-1.5 rounded-full mb-2">
            📸 TAG US #GALOKIDS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">
            We Are On <span className="text-rose-500">Instagram</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="h-44 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              <img src="https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=400" alt="Instagram 1" className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </div>
            <div className="h-44 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              <img src="https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&q=80&w=400" alt="Instagram 2" className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </div>
            <div className="h-44 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              <img src="https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&q=80&w=400" alt="Instagram 3" className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </div>
            <div className="h-44 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              <img src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=400" alt="Instagram 4" className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </div>
          </div>
        </section>

        {/* 8. Newsletter Strip */}
        <div className="px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 mb-16">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
            <div>
              <h3 className="text-xl sm:text-3xl font-black mb-1">
                {language === 'ku' ? 'تێکەڵ بە یانەی منداڵان بە & ١٥٪ داشکاندن بەدەستبهێنە!' : 'Join Our Happy Kids Club & Get 15% Off!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-bold">
                {language === 'ku' ? 'نوێترین مۆدێل و ئاگاداری داشکاندنەکان ڕاستەوخۆ وەربگرە.' : 'Subscribe to get unique discount offers & newest arrivals.'}
              </p>
            </div>
            <div className="flex w-full md:w-auto items-center gap-2">
              <input type="email" placeholder="email@example.com" className="px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold w-full md:w-64 focus:outline-none focus:border-rose-500" />
              <button className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs shadow-md shrink-0 cursor-pointer hover:from-rose-600 hover:to-pink-600">
                Subscribe
              </button>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

