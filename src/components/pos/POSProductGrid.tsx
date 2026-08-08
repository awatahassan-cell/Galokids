import React, { useState, useMemo } from 'react';
import { Search, Plus, RotateCcw, Package, Tag, Filter, Check } from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex } from '../../utils/colors';
import { Pagination } from '../Pagination';

export interface POSProductGridProps {
  products: Product[];
  search: string;
  setSearch: (s: string) => void;
  addToPosCart: (product: Product, variation: ProductVariation) => void;
  setShowReturn: (b: boolean) => void;
  setShowQuickAdd: (b: boolean) => void;
  productsPagination: any;
  refreshProducts: (page: number, limit: number, filters?: any) => void;
}

export const POSProductGrid: React.FC<POSProductGridProps> = ({
  products,
  search,
  setSearch,
  addToPosCart,
  setShowReturn,
  setShowQuickAdd,
  productsPagination,
  refreshProducts,
}) => {
  const { t, language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  const [selectedGender, setSelectedGender] = useState<number | 'all'>('all');

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedGender !== 'all') {
      list = list.filter(p => Number(p.gender) === selectedGender || Number(p.gender) === 3);
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.nameKu || '').toLowerCase().includes(q) ||
      (p.nameAr || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  }, [products, search, selectedGender]);

  const getProductName = (product: Product) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden font-arabic">
      {/* Search & Actions Top Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          {/* Barcode / Name Search Field */}
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const code = search.trim().toLowerCase();
                if (!code) return;
                const match = products.find(p => (p.barcode || '').toLowerCase() === code)
                  || (filteredProducts.length === 1 ? filteredProducts[0] : undefined);
                if (match) {
                  const firstVar = (match.variations || []).find(v => v.stockQuantity > 0) || (match.variations || [])[0];
                  if (firstVar) {
                    addToPosCart(match, firstVar);
                    setSearch('');
                  }
                }
              }}
              className={`w-full ${isRTL ? 'pr-10 pl-4 text-right font-arabic' : 'pl-10 pr-4'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400`}
              placeholder={t('searchProducts') || 'Search product or scan barcode...'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReturn(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('returnRefund') || 'Return'}</span>
            </button>

            <button
              onClick={() => setShowQuickAdd(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-200 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t('quickAdd') || 'Quick Add'}</span>
            </button>
          </div>
        </div>

        {/* Gender Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedGender('all')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${selectedGender === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {language === 'ku' ? 'هەموو بەرهەمەکان' : language === 'ar' ? 'جميع المنتجات' : 'All Catalog'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedGender(1)}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${selectedGender === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            👦 {t('forBoys') || 'Boys'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedGender(2)}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${selectedGender === 2 ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            👧 {t('forGirls') || 'Girls'}
          </button>
        </div>
      </div>

      {/* Product Catalog Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Package className="w-12 h-12 mb-3 text-slate-300 animate-bounce" />
            <p className="text-xs font-bold text-slate-600">{t('noProductsFound') || 'No products found'}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t('tryAdjustingFilters') || 'Try searching another term or bar code.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredProducts.map(product => {
              const totalStock = (product.variations || []).reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
              const isOut = totalStock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (isOut) return;
                    const firstVar = (product.variations || []).find(v => v.stockQuantity > 0) || (product.variations || [])[0];
                    if (firstVar) {
                      addToPosCart(product, firstVar);
                    }
                  }}
                  className={`bg-white rounded-xl border p-2 flex flex-col justify-between transition-all relative group ${
                    isOut
                      ? 'border-slate-200 opacity-60 bg-slate-50/80 cursor-not-allowed'
                      : 'border-slate-200 hover:border-indigo-500 hover:shadow-md cursor-pointer active:scale-98'
                  }`}
                >
                  <div>
                    {/* Stock Status Badge */}
                    <span className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} z-10 text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs ${
                      totalStock === 0 ? 'bg-rose-500 text-white' : totalStock <= 5 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-900/80 text-white'
                    }`}>
                      {totalStock === 0 ? (t('outOfStock') || 'Out') : `${totalStock}`}
                    </span>

                    {/* Image */}
                    <div className="w-full aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2 border border-slate-100">
                      <img
                        src={product.imageUrl}
                        alt={getProductName(product)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Product Name */}
                    <h3 className="font-bold text-slate-900 text-xs leading-tight truncate mb-1" title={getProductName(product)}>
                      {getProductName(product)}
                    </h3>

                    {/* Price */}
                    <p className="font-black text-indigo-600 text-xs mb-2">
                      {formatIQDLabel(Number(product.price || 0))}
                    </p>
                  </div>

                  {/* Variation Selector List */}
                  <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-1.5" onClick={(e) => e.stopPropagation()}>
                    {(product.variations || []).map(v => {
                      const varOut = (v.stockQuantity || 0) <= 0;
                      return (
                        <button
                          key={v.id}
                          disabled={varOut}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (varOut) return;
                            addToPosCart(product, v);
                          }}
                          className={`px-1.5 py-0.5 text-[9.5px] rounded-lg font-bold border transition-all cursor-pointer ${
                            varOut
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-50 cursor-not-allowed'
                              : 'bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 border-slate-200 hover:border-indigo-600'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: getColorHex(v.color) }} />
                            <span>{v.size}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {productsPagination && productsPagination.lastPage > 1 && (
        <div className="pt-3 border-t border-slate-200 mt-2">
          <Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 20, { search })} />
        </div>
      )}
    </div>
  );
};
