import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ProductCard } from '../components/ProductCard';
import { ProductFilter, FilterState } from '../components/ProductFilter';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { useStore } from '../store';
import { Filter, Loader2 } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { useLanguage } from '../i18n/LanguageContext';

export const Products: React.FC = () => {
  const { products, productsPagination, refreshProducts, isProductsLoading, categories } = useStore();
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const genderParam = searchParams.get('gender');
  const categoryParam = searchParams.get('category');
  
  const initialGender = useMemo(() => {
    if (genderParam === null || genderParam === '') return null;
    if (genderParam === 'boy') return 1;
    if (genderParam === 'girl') return 2;
    if (genderParam === 'both' || genderParam === 'unisex') return 0;
    const parsed = Number(genderParam);
    return Number.isNaN(parsed) ? null : parsed;
  }, [genderParam]);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sort, setSort] = useState<string>('newest');
  const [filters, setFilters] = useState<FilterState>({
    categoryId: null,
    gender: initialGender,
    colors: [],
    sizes: [],
    inStockOnly: false,
  });

  const prevCategoryParam = React.useRef(categoryParam);
  const prevGenderParam = React.useRef(genderParam);

  const handleClearAll = () => {
    prevCategoryParam.current = null;
    prevGenderParam.current = null;
    setSearchParams({});
    setFilters({
      categoryId: null,
      gender: null,
      colors: [],
      sizes: [],
      inStockOnly: false,
    });
  };

  useEffect(() => {
    let hasChanges = false;
    let targetGender = filters.gender;
    let targetCategory = filters.categoryId;
    
    if (genderParam !== prevGenderParam.current) {
      targetGender = initialGender;
      hasChanges = true;
      prevGenderParam.current = genderParam;
    }
    
    if (categoryParam !== prevCategoryParam.current || (categoryParam && categories.length > 0 && targetCategory === null)) {
      if (categoryParam && categories.length > 0) {
        const matchedCategory = categories.find(c => 
          (c.slug && c.slug.toLowerCase() === categoryParam.toLowerCase()) || 
          c.name.toLowerCase() === categoryParam.toLowerCase()
        );
        if (matchedCategory && targetCategory !== matchedCategory.id) {
          targetCategory = matchedCategory.id;
          hasChanges = true;
        }
      } else if (!categoryParam && targetCategory !== null && prevCategoryParam.current !== categoryParam) {
        targetCategory = null;
        hasChanges = true;
      }
      prevCategoryParam.current = categoryParam;
    }

    if (hasChanges) {
      setFilters(prev => ({
        ...prev,
        gender: targetGender,
        categoryId: targetCategory,
      }));
    }
  }, [initialGender, categoryParam, genderParam, categories]);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  const filterKey = useMemo(() => JSON.stringify({ searchQuery, filters, sort }), [searchQuery, filters, sort]);

  useEffect(() => {
    refreshProducts(1, 20, { ...filters, search: searchQuery, sort }, false);
    // eslint-disable-next-deps
  }, [filterKey]);

  const handleLoadMore = React.useCallback(async () => {
    if (isProductsLoading || isLoadingMore) return;
    const currentLength = products?.length || 0;
    if (productsPagination && currentLength >= productsPagination.total) return;

    setIsLoadingMore(true);
    const nextPage = Math.floor(currentLength / 20) + 1;
    try {
      await refreshProducts(nextPage, 20, { ...filters, search: searchQuery, sort }, true);
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isProductsLoading, isLoadingMore, products?.length, productsPagination, refreshProducts, filters, searchQuery, sort]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore && !isProductsLoading) {
          if (productsPagination && products.length < productsPagination.total) {
            handleLoadMore();
          }
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [handleLoadMore, isLoadingMore, isProductsLoading, products.length, productsPagination]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // If backend filtering is working, this local filter might still be useful as a double-check
      // or for fields not handled by backend (like local search fallback)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameEn = (product.name || '').toLowerCase();
        const nameKu = (product.nameKu || '').toLowerCase();
        const nameAr = (product.nameAr || '').toLowerCase();
        const descEn = (product.description || '').toLowerCase();
        
        if (!nameEn.includes(query) && !nameKu.includes(query) && !nameAr.includes(query) && !descEn.includes(query)) {
          return false;
        }
      }

      if (filters.categoryId && String(product.categoryId) !== String(filters.categoryId)) return false;
      if (filters.gender !== null && Number(product.gender) !== 0 && Number(product.gender) !== Number(filters.gender)) return false;

      const variations = product.variations || [];
      const totalStock = variations.length > 0 
        ? variations.reduce((acc, curr) => acc + (Number(curr.stockQuantity) || 0), 0)
        : ((product as any).stockQuantity !== undefined ? Number((product as any).stockQuantity) : 99);

      if (filters.inStockOnly && totalStock === 0) return false;

      let matchesColor = filters.colors.length === 0;
      let matchesSize = filters.sizes.length === 0;

      if (!matchesColor || !matchesSize) {
        const matchingVariation = variations.some(v => {
          const colorMatch = filters.colors.length === 0 || filters.colors.includes(v.color);
          const sizeMatch = filters.sizes.length === 0 || filters.sizes.includes(v.size);
          const stockMatch = !filters.inStockOnly || v.stockQuantity > 0;
          return colorMatch && sizeMatch && stockMatch;
        });
        if (!matchingVariation) return false;
      }

      return true;
    });
  }, [filters, products, searchQuery]);

  const isRTL = language === 'ar' || language === 'ku';

  return (
    <div className="flex-grow max-w-7xl mx-auto w-full">
      <div className="px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10 mb-6 flex items-center justify-between">
        <h2 className={`text-lg sm:text-xl font-bold text-slate-900 tracking-tight ${isRTL ? 'font-arabic' : 'font-display'}`}>
          {searchQuery ? `${t('search')}: "${searchQuery}"` : t('allProducts')}
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-full hover:bg-slate-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="newest">{t('sortNewest') || 'Newest'}</option>
            <option value="price_asc">{t('sortPriceAsc') || 'Price: Low to High'}</option>
            <option value="price_desc">{t('sortPriceDesc') || 'Price: High to Low'}</option>
            <option value="name_asc">{t('sortName') || 'Name (A–Z)'}</option>
          </select>
          <button
            className="lg:hidden p-2.5 flex items-center justify-center text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shadow-sm border border-slate-200 active:scale-95 shrink-0"
            onClick={() => setIsFilterOpen(true)}
            aria-label={t('filters')}
            title={t('filters')}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-shrink-0 lg:w-64">
            <ProductFilter 
              filters={filters} 
              setFilters={setFilters} 
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              onClearAll={handleClearAll}
            />
          </div>

          <div className="flex-grow">
            {isProductsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <motion.div 
                layout 
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product, idx) => (
                    <motion.div
                      key={product?.id || idx}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="text-center py-24 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <h3 className={`text-lg font-semibold text-slate-900 mb-2 ${isRTL ? 'font-arabic' : ''}`}>{t('noProductsFound')}</h3>
                <p className={`text-slate-500 ${isRTL ? 'font-arabic' : ''}`}>{t('tryAdjustingFilters')}</p>
                <button 
                  onClick={handleClearAll}
                  className="mt-6 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-indigo-700 bg-grape-100 hover:bg-indigo-200 transition-colors"
                >
                  {t('clearFilters')}
                </button>
              </div>
            )}
            {productsPagination && (
              <div className="mt-10 flex flex-col items-center justify-center gap-3">
                {products.length < productsPagination.total && (
                  <div ref={loadMoreRef} className="py-6 flex items-center justify-center gap-2 text-slate-600 font-semibold text-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-900 shrink-0" />
                    <span>{t('loading') || 'بارکردن...'}</span>
                  </div>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  {t('showing') || 'Showing'} {filteredProducts.length} {productsPagination.total ? `${t('of') || 'of'} ${productsPagination.total}` : ''} {t('products') || 'products'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
