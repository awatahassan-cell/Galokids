import React, { useState, useMemo } from 'react';
import { Search, Plus, RotateCcw, Package, Tag, Filter, Check, ScanBarcode, X, Layers, ShoppingBag } from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex } from '../../utils/colors';
import { Pagination } from '../Pagination';
import { useToast } from '../ui/Feedback';

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
  const toast = useToast();

  const [selectedGender, setSelectedGender] = useState<number | 'all'>('all');
  const [variationModalProduct, setVariationModalProduct] = useState<Product | null>(null);

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
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    );
  }, [products, search, selectedGender]);

  const getProductName = (product: Product) => {
    if (language === 'ku' && product.nameKu) return product.nameKu;
    if (language === 'ar' && product.nameAr) return product.nameAr;
    return product.name;
  };

  const handleBarcodeSubmit = () => {
    const code = search.trim().toLowerCase();
    if (!code) return;

    // Search by exact barcode or SKU match, or single filtered match
    const match = products.find(p => 
      (p.barcode || '').toLowerCase() === code || 
      (p.sku || '').toLowerCase() === code
    ) || (filteredProducts.length === 1 ? filteredProducts[0] : undefined);

    if (match) {
      const vars = match.variations || [];
      if (vars.length === 1) {
        // SINGLE VARIATION: Add directly to cart!
        const singleVar = vars[0];
        if ((singleVar.stockQuantity || 0) > 0) {
          addToPosCart(match, singleVar);
          toast(language === 'ku' ? `بەرهەمی "${getProductName(match)}" بە سەرکەوتوویی زیاکرا بۆ سەبەتە 🛒` : `Product added to cart 🛒`);
          setSearch('');
        } else {
          toast(language === 'ku' ? 'ئەم بەرهەمە ستۆکی نەماوە!' : 'Product is out of stock!', 'error');
        }
      } else if (vars.length > 1) {
        // MULTIPLE VARIATIONS: Open modal prompting cashier to pick variation!
        setVariationModalProduct(match);
        setSearch('');
      } else {
        toast(language === 'ku' ? 'هیچ جۆرێک بۆ ئەم بەرهەمە تێدانییە!' : 'No variations found for this product!', 'error');
      }
    } else {
      toast(language === 'ku' ? 'هیچ بەرهەمێک نەدۆزرایەوە بەم بارکۆدە!' : 'No product found with this barcode!', 'error');
    }
  };

  const handleProductCardClick = (product: Product) => {
    const vars = product.variations || [];
    if (vars.length === 1) {
      const singleVar = vars[0];
      if ((singleVar.stockQuantity || 0) > 0) {
        addToPosCart(product, singleVar);
        toast(language === 'ku' ? `زیادکرا بۆ سەبەتە 🛒` : `Added to cart 🛒`);
      } else {
        toast(language === 'ku' ? 'ئەم بەرهەمە ستۆکی نەماوە!' : 'Product is out of stock!', 'error');
      }
    } else if (vars.length > 1) {
      setVariationModalProduct(product);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden font-arabic min-w-0">
      {/* Top Search & Filter Bar */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] p-4 shadow-xs mb-4 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Barcode & Name Search Input */}
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBarcodeSubmit();
                }
              }}
              className={`w-full ${isRTL ? 'pr-11 pl-4 text-right font-arabic' : 'pl-11 pr-4'} py-3 bg-white/90 border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-2xs`}
              placeholder={t('searchProducts') || 'Search product name or scan barcode...'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute ${isRTL ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-700`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>{L("Quick Add Product")}</span>
          </button>
        </div>
      </div>

      {/* Product Catalog Grid (Dedicated Scrollable Area) */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pr-0.5 pb-6">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-white/80 p-8 text-center">
            <Package className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
            <h4 className="text-sm font-black text-slate-700">{L("No products found")}</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">{L("Try searching with another name or scan a different barcode.")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-2.5">
            {filteredProducts.map(product => {
              const variations = product.variations || [];
              const totalStock = variations.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
              const displayPrice = product.discountPrice || product.price;

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductCardClick(product)}
                  className="bg-white/80 backdrop-blur-md border border-white/90 rounded-xl p-2 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group relative overflow-hidden cursor-pointer"
                >
                  <div>
                    {/* Image & Stock Badge */}
                    <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-1.5 bg-slate-100/80">
                      <img
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&q=80&w=800'}
                        alt={getProductName(product)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Stock Badge */}
                      <span className={`absolute top-1 ${isRTL ? 'right-1' : 'left-1'} px-1.5 py-0.5 rounded-full text-[8px] font-black shadow-2xs ${
                        totalStock > 10 ? 'bg-emerald-500 text-white' : totalStock > 0 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {totalStock > 0 ? `${totalStock}` : '0'}
                      </span>
                    </div>

                    {/* Product Title */}
                    <h3 className="text-[10px] font-bold text-slate-900 truncate mb-0.5" title={getProductName(product)}>
                      {getProductName(product)}
                    </h3>

                    {/* Price Label */}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-[11px] font-black text-slate-900">
                        {formatIQDLabel(Number(displayPrice || 0))}
                      </span>
                      {Boolean(product.discountPrice) && (
                        <span className="text-[8px] font-bold text-slate-400 line-through">
                          {formatIQDLabel(Number(product.price || 0))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Variation Chips */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto hide-scrollbar">
                      {variations.map(variation => {
                        const isOutOfStock = (variation.stockQuantity || 0) <= 0;
                        const hexColor = getColorHex(variation.color || '');

                        return (
                          <button
                            key={variation.id}
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToPosCart(product, variation);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                              isOutOfStock
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-2xs active:scale-95'
                            }`}
                            title={`${variation.size} - ${variation.color} (${variation.stockQuantity} available)`}
                          >
                            {hexColor && (
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 border border-white/40" style={{ backgroundColor: hexColor }} />
                            )}
                            <span>{variation.size}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {productsPagination && productsPagination.totalPages > 1 && (
        <div className="pt-2 shrink-0">
          <Pagination
            currentPage={productsPagination.currentPage}
            totalPages={productsPagination.totalPages}
            onPageChange={(page) => refreshProducts(page, 20, { search })}
          />
        </div>
      )}

      {/* Multiple Variation Picker Modal */}
      {variationModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 font-arabic animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 truncate max-w-[220px]">
                    {getProductName(variationModalProduct)}
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-600">
                    {language === 'ku' ? 'تکایە جۆرێک هەڵبژێرە بۆ زیادکردن' : language === 'ar' ? 'اختر النوع للإضافة' : 'Select a variation to add to order'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVariationModalProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Variations Grid Options */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto hide-scrollbar py-1">
              {(variationModalProduct.variations || []).map(v => {
                const isOutOfStock = (v.stockQuantity || 0) <= 0;
                const hexColor = getColorHex(v.color || '');

                return (
                  <button
                    key={v.id}
                    disabled={isOutOfStock}
                    onClick={() => {
                      addToPosCart(variationModalProduct, v);
                      toast(language === 'ku' ? `جۆری (${v.size} - ${v.color}) زیادکرا بۆ سەبەتە 🛒` : `Variation added to cart 🛒`);
                      setVariationModalProduct(null);
                    }}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-right cursor-pointer ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                        : 'bg-white hover:bg-indigo-50/70 border-slate-200 hover:border-indigo-300 text-slate-900 shadow-2xs active:scale-98'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {hexColor && (
                        <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0" style={{ backgroundColor: hexColor }} />
                      )}
                      <div>
                        <span className="text-xs font-black block">{v.size} {v.color ? `- ${v.color}` : ''}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {language === 'ku' ? `بڕی ماوە لە کۆگا: ${v.stockQuantity} دانە` : language === 'ar' ? `الكمية المتبقية: ${v.stockQuantity}` : `Remaining Stock: ${v.stockQuantity}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-600">
                        {formatIQDLabel(Number(variationModalProduct.discountPrice || variationModalProduct.price || 0))}
                      </span>
                      <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
