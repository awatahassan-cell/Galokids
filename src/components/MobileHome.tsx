import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { CategoryIcon } from './CategoryIcon';
import { Product } from '../types';

/**
 * The home page as a phone shows it.
 *
 * The wide layout stacks badly on a small screen: a 620px banner, then rows of
 * 200px cards, so a shopper scrolled past most of a screen of advertising
 * before reaching a price. This is the same content arranged for a thumb —
 * search at the top, categories as a single strip of circles, deals in one
 * swipeable row, then a two-up grid of products.
 *
 * It renders only below `lg`; above that the original layout takes over.
 */

/** A soft ring colour per category, cycled so the strip is not one flat block. */
const RINGS = [
  'bg-candy-50 text-candy-600 border-candy-100',
  'bg-sky-50 text-sky-600 border-sky-100',
  'bg-sunny-50 text-amber-600 border-amber-100',
  'bg-mint-50 text-emerald-600 border-emerald-100',
  'bg-grape-50 text-grape-600 border-grape-100',
  'bg-bubble-50 text-bubble-600 border-bubble-100',
];

const SectionHeader: React.FC<{ title: string; to: string; viewAll: string }> = ({ title, to, viewAll }) => (
  <div className="flex items-center justify-between gap-3 px-4 mb-3">
    <h2 className="text-lg font-black text-slate-900 tracking-tight">{title}</h2>
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs font-black text-candy-700 active:scale-95 transition-transform shrink-0"
    >
      {viewAll}
      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
    </Link>
  </div>
);

/**
 * The search bar, above the banner.
 *
 * Split out of the block below so it can sit at the very top of the page: on a
 * phone, search is the first thing a shopper who knows what they want reaches
 * for, and putting it under the advert makes them scroll to find it.
 */
export const MobileSearchBar: React.FC<{ language: string }> = ({ language }) => {
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  return (
    <div className="lg:hidden px-3 pt-3 font-arabic">
      <Link
        to="/products"
        className="flex items-center gap-3 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-2xs active:scale-[0.99] transition-transform"
      >
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <span className="text-sm font-bold text-slate-400 truncate grow text-start">
          {L('گەڕان بۆ پۆشاک، جانتا…', 'ابحث عن ملابس، حقائب…', 'Search for clothes, bags…')}
        </span>
        <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
      </Link>
    </div>
  );
};

export const MobileHome: React.FC<{
  categories: any[];
  products: Product[];
  isLoading: boolean;
  getCategoryName: (c: any) => string;
  language: string;
}> = ({ categories, products, isLoading, getCategoryName, language }) => {
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  // Anything with a real discount is a deal; failing that, just the newest, so
  // the row is never empty on a shop that has not set any discounts yet.
  const deals = React.useMemo(() => {
    const discounted = products.filter(
      p => Number(p.discountPrice) > 0 && Number(p.discountPrice) < Number(p.price)
    );
    return (discounted.length > 0 ? discounted : products).slice(0, 10);
  }, [products]);

  const popular = React.useMemo(() => [...products].reverse().slice(0, 8), [products]);

  // Five categories fit the strip; the sixth spot goes to "More" so nothing is
  // hidden without a way through to it.
  const strip = categories.slice(0, 5);

  return (
    <div className="lg:hidden font-arabic">
      {/* Categories, as one strip of circles. */}
      {categories.length > 0 && (
        <div className="mt-4">
          <div className="flex items-start gap-1 overflow-x-auto scrollbar-hide px-3 pb-1">
            {strip.map((c, idx) => (
              <Link
                key={c.id}
                to={`/products?category=${encodeURIComponent(c.slug || c.name)}`}
                className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 active:scale-95 transition-transform"
              >
                <span
                  className={`w-14 h-14 rounded-full border flex items-center justify-center overflow-hidden ${RINGS[idx % RINGS.length]}`}
                >
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <CategoryIcon name={c.icon || c.name} className="w-6 h-6" />
                  )}
                </span>
                <span className="text-[11px] font-bold text-slate-700 text-center leading-tight line-clamp-2">
                  {getCategoryName(c)}
                </span>
              </Link>
            ))}

            <Link
              to="/products"
              className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 active:scale-95 transition-transform"
            >
              <span className="w-14 h-14 rounded-full border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center">
                <span className="grid grid-cols-2 gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} className="w-2 h-2 rounded-[3px] bg-current" />
                  ))}
                </span>
              </span>
              <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">
                {L('زیاتر', 'المزيد', 'More')}
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Deals — one swipeable row, so a glance costs no scrolling. */}
      {(isLoading || deals.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <SectionHeader
            title={L('کڕینی ئەمڕۆ', 'عروض اليوم', 'Deals of the Day')}
            to="/products?sale=1"
            viewAll={L('هەمووی', 'عرض الكل', 'View All')}
          />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-3 pb-2">
            {isLoading
              ? [1, 2, 3].map(i => (
                  <div key={i} className="w-[46%] min-w-[46%] shrink-0 snap-start">
                    <ProductCardSkeleton />
                  </div>
                ))
              : deals.map(product => (
                  <div key={product.id} className="w-[46%] min-w-[46%] shrink-0 snap-start">
                    <ProductCard product={product} compact />
                  </div>
                ))}
          </div>
        </motion.section>
      )}

      {/* Popular — a two-up grid, which is how a phone browses a catalogue. */}
      {(isLoading || popular.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <SectionHeader
            title={L('بەناوبانگترینەکان', 'المنتجات الرائجة', 'Popular Products')}
            to="/products"
            viewAll={L('هەمووی', 'عرض الكل', 'View All')}
          />
          <div className="grid grid-cols-2 gap-3 px-3">
            {isLoading
              ? [1, 2, 3, 4].map(i => <ProductCardSkeleton key={i} />)
              : popular.map(product => <ProductCard key={product.id} product={product} compact />)}
          </div>

          <div className="px-3 mt-5">
            <Link
              to="/products"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-black text-white bg-slate-900 active:scale-[0.98] transition-transform"
            >
              {L('بینینی سەرجەم بەرهەمەکان', 'عرض جميع المنتجات', 'View All Products')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </motion.section>
      )}
    </div>
  );
};
