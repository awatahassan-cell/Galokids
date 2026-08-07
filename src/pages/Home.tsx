import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { PromoBanner } from '../components/PromoBanner';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { CategoryIcon } from '../components/CategoryIcon';
import { CountdownBanner } from '../components/CountdownBanner';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Product } from '../types';
import { motion } from 'motion/react';

const cardWidth = 'w-[calc(50%-0.5rem)] min-w-[calc(50%-0.5rem)] max-w-[calc(50%-0.5rem)] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px] lg:w-[220px] lg:min-w-[220px] lg:max-w-[220px] flex-shrink-0 snap-start';

const ProductRow: React.FC<{
  title: string;
  subtitle?: string;
  titleClass?: string;
  linkTo?: string;
  isLoading: boolean;
  products: Product[];
  shopAllLabel: string;
}> = ({ title, subtitle, titleClass, linkTo, isLoading, products, shopAllLabel }) => {
  if (!isLoading && products.length === 0) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 flex items-end justify-between gap-2">
        <div>
          <h2 className={`text-xl sm:text-3xl font-extrabold font-display tracking-tight ${titleClass || 'text-slate-900'}`}>{title}</h2>
          {subtitle && <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link to={linkTo} className="inline-flex items-center text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-full hover:bg-sky-100 transition-all shrink-0 active:scale-95">
            {shopAllLabel} <ArrowRight className="w-3.5 h-3.5 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180" />
          </Link>
        )}
      </div>
      <div className="px-4 sm:px-6 lg:px-8 pb-12 overflow-hidden">
        <div className="flex overflow-x-auto gap-4 pb-6 -mb-6 scrollbar-hide snap-x snap-mandatory">
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

  const featuredProducts = products.length > 0 ? [...products].reverse().slice(0, 10) : [];
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

  const getCategoryName = (c: any) => (language === 'ku' && c.nameKu) ? c.nameKu : (language === 'ar' && c.nameAr) ? c.nameAr : c.name;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    fetchBestSellers(10).then(setBestSellers).catch(() => {});
    return () => clearTimeout(timer);
  }, [fetchBestSellers]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-grow"
    >
      <div className="max-w-7xl mx-auto">
        <CountdownBanner />
        <Hero />

        {/* Shop by category cards */}
        {categories.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight text-slate-900 ${language === 'ar' || language === 'ku' ? 'font-arabic' : 'font-display'}`}>
                {language === 'ku' ? 'پۆلەکان' : language === 'ar' ? 'الأقسام' : 'Categories'}
              </h2>
              <Link 
                to="/products" 
                className={`text-xs sm:text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors ${language === 'ar' || language === 'ku' ? 'font-arabic' : ''}`}
              >
                {t('shopAll')} &rarr;
              </Link>
            </div>

            <div className="flex gap-3 sm:gap-5 overflow-x-auto scrollbar-hide pb-4 pt-1 snap-x snap-mandatory">
              {categories.map((c, idx) => {
                const kidPalettes = [
                  {
                    cardBg: 'bg-[#FFFBEB] hover:bg-[#FEF3C7]',
                    badgeBg: 'bg-[#FEF08A]/70 text-[#D97706]',
                    textColor: 'text-[#B45309]',
                  },
                  {
                    cardBg: 'bg-[#F0F9FF] hover:bg-[#E0F2FE]',
                    badgeBg: 'bg-[#BAE6FD]/70 text-[#0284C7]',
                    textColor: 'text-[#0369A1]',
                  },
                  {
                    cardBg: 'bg-[#FFF1F2] hover:bg-[#FFE4E6]',
                    badgeBg: 'bg-[#FECDD3]/70 text-[#E11D48]',
                    textColor: 'text-[#BE123C]',
                  },
                  {
                    cardBg: 'bg-[#F0FDF4] hover:bg-[#DCFCE7]',
                    badgeBg: 'bg-[#BBF7D0]/70 text-[#16A34A]',
                    textColor: 'text-[#15803D]',
                  },
                  {
                    cardBg: 'bg-[#FAF5FF] hover:bg-[#F3E8FF]',
                    badgeBg: 'bg-[#E9D5FF]/70 text-[#9333EA]',
                    textColor: 'text-[#7E22CE]',
                  },
                  {
                    cardBg: 'bg-[#FFF7ED] hover:bg-[#FFEDD5]',
                    badgeBg: 'bg-[#FED7AA]/70 text-[#EA580C]',
                    textColor: 'text-[#C2410C]',
                  },
                ];
                const palette = kidPalettes[idx % kidPalettes.length];
                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ scale: 1.04, y: -4 }}
                    whileTap={{ scale: 0.96 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className="snap-start"
                  >
                    <Link
                      to={`/products?category=${encodeURIComponent(c.slug || c.name)}`}
                      className={`flex flex-col items-center justify-center w-[125px] sm:w-[150px] md:w-[165px] h-[145px] sm:h-[170px] p-4 sm:p-5 rounded-[26px] sm:rounded-[32px] transition-all shadow-xs hover:shadow-md cursor-pointer ${palette.cardBg}`}
                    >
                      <div className={`w-14 h-14 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-transform hover:rotate-6 ${palette.badgeBg}`}>
                        <CategoryIcon name={c.icon || c.name} className="w-7 h-7 sm:w-9 sm:h-9" />
                      </div>
                      <span className={`mt-3 text-sm sm:text-base font-extrabold whitespace-nowrap text-center font-arabic ${palette.textColor}`}>
                        {getCategoryName(c)}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="mt-6" />

        <ProductRow title={t('featuredProducts')} subtitle={t('ourCollection')} linkTo="/products"
          isLoading={isLoading} products={featuredProducts} shopAllLabel={t('shopAll')} />

        <ProductRow title={t('bestSellers') || 'Best Sellers'} subtitle={t('bestSellersDesc') || 'What everyone is buying'}
          titleClass="text-amber-500" linkTo="/products" isLoading={isLoading} products={bestSellers} shopAllLabel={t('shopAll')} />

        <ProductRow title={t('forBoys')} subtitle={t('forBoysDesc')} titleClass="text-sky-600"
          linkTo="/products?gender=1" isLoading={isLoading} products={boysProducts} shopAllLabel={t('shopAll')} />

        <ProductRow title={t('forGirls')} subtitle={t('forGirlsDesc')} titleClass="text-rose-500"
          linkTo="/products?gender=2" isLoading={isLoading} products={girlsProducts} shopAllLabel={t('shopAll')} />

        {recentlyViewed.length > 0 && (
          <ProductRow title={t('recentlyViewed') || 'Recently Viewed'} titleClass="text-slate-800"
            isLoading={false} products={recentlyViewed} shopAllLabel={t('shopAll')} />
        )}

        {/* Verified reviews social proof */}
        {topReviews.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 pb-12">
            <h2 className="text-3xl font-bold font-display text-slate-900 tracking-tight mb-8">{t('customerReviews')}</h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-2">
              {topReviews.map(r => (
                <div key={r.id} className="min-w-[280px] max-w-[280px] bg-white rounded-2xl border border-slate-100 shadow-sm p-5 snap-start">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className={s <= r.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 mb-3">“{r.comment}”</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{r.author}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ {t('verifiedPurchase') || 'Verified'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-8 pb-24">
          <PromoBanner />
        </div>
      </div>
    </motion.div>
  );
};

