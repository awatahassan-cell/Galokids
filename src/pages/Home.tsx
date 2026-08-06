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
      <div className="px-4 sm:px-6 lg:px-8 mb-8 flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold font-display tracking-tight ${titleClass || 'text-slate-900'}`}>{title}</h2>
          {subtitle && <p className="text-slate-500 mt-2">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link to={linkTo} className="hidden sm:inline-flex items-center text-sm font-semibold text-sky-600 hover:text-sky-700 hover:underline underline-offset-4">
            {shopAllLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
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

// Shop by category chips
        {categories.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="px-4 sm:px-6 lg:px-8 mt-12"
          >
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((c, idx) => {
                const kidColors = [
                  {
                    bg: 'bg-rose-50/70 hover:bg-rose-100/80 border-rose-100/60',
                    iconBg: 'bg-rose-100 text-rose-500',
                    text: 'text-rose-700',
                  },
                  {
                    bg: 'bg-sky-50/70 hover:bg-sky-100/80 border-sky-100/60',
                    iconBg: 'bg-sky-100 text-sky-500',
                    text: 'text-sky-700',
                  },
                  {
                    bg: 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-100/60',
                    iconBg: 'bg-amber-100 text-amber-500',
                    text: 'text-amber-700',
                  },
                  {
                    bg: 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-100/60',
                    iconBg: 'bg-emerald-100 text-emerald-500',
                    text: 'text-emerald-700',
                  },
                  {
                    bg: 'bg-purple-50/70 hover:bg-purple-100/80 border-purple-100/60',
                    iconBg: 'bg-purple-100 text-purple-500',
                    text: 'text-purple-700',
                  },
                  {
                    bg: 'bg-orange-50/70 hover:bg-orange-100/80 border-orange-100/60',
                    iconBg: 'bg-orange-100 text-orange-500',
                    text: 'text-orange-700',
                  },
                ];
                const color = kidColors[idx % kidColors.length];
                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                  >
                    <Link
                      to={`/products?category=${encodeURIComponent(c.slug || c.name)}`}
                      className={`flex flex-col items-center gap-2.5 min-w-[94px] p-3.5 rounded-2xl border transition-all shadow-xs hover:shadow-sm ${color.bg}`}
                    >
                      <span className={`w-12 h-12 rounded-full flex items-center justify-center ${color.iconBg}`}>
                        <CategoryIcon name={c.icon} />
                      </span>
                      <span className={`text-xs font-black whitespace-nowrap ${color.text}`}>{getCategoryName(c)}</span>
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

