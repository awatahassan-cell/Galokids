import React, { useState, useMemo } from 'react';
import { X, Search, Filter, Save, Plus, Minus, Layers, CheckCircle2, RefreshCcw, Boxes } from 'lucide-react';
import { Product, ProductVariation, Category } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { getColorHex } from '../../utils/colors';

interface BulkStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  updateProduct: (product: Product) => void;
  toast: (msg: string, type?: 'success' | 'error') => void;
}

export const BulkStockModal: React.FC<BulkStockModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  updateProduct,
  toast,
}) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  
  // Map of variation id -> new stock quantity override
  const [modifiedStock, setModifiedStock] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCat !== 'all' && String(p.categoryId) !== String(selectedCat)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameEn = (p.name || '').toLowerCase();
        const nameKu = (p.nameKu || '').toLowerCase();
        const nameAr = (p.nameAr || '').toLowerCase();
        const barcode = (p.barcode || p.sku || '').toLowerCase();
        if (!nameEn.includes(q) && !nameKu.includes(q) && !nameAr.includes(q) && !barcode.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, search, selectedCat]);

  if (!isOpen) return null;

  const handleStockChange = (variationId: string, currentVal: number, delta: number) => {
    const activeVal = modifiedStock[variationId] !== undefined ? modifiedStock[variationId] : currentVal;
    const newVal = Math.max(0, activeVal + delta);
    setModifiedStock(prev => ({ ...prev, [variationId]: newVal }));
  };

  const handleStockInput = (variationId: string, value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setModifiedStock(prev => ({ ...prev, [variationId]: parsed }));
  };

  const handleBatchAdd = (addQty: number) => {
    const next: Record<string, number> = { ...modifiedStock };
    filteredProducts.forEach(p => {
      (p.variations || []).forEach(v => {
        const current = next[v.id] !== undefined ? next[v.id] : (v.stockQuantity || 0);
        next[v.id] = Math.max(0, current + addQty);
      });
    });
    setModifiedStock(next);
  };

  const handleReset = () => {
    setModifiedStock({});
  };

  const handleSaveAll = async () => {
    const keys = Object.keys(modifiedStock);
    if (keys.length === 0) {
      toast(language === 'ku' ? 'هیچ گۆڕانکارییەک نەکراوە!' : 'No stock changes to save!', 'error');
      return;
    }

    setIsSaving(true);
    let updatedProductsCount = 0;

    try {
      // Find all products that have modified variations
      for (const p of products) {
        const hasModifiedVar = (p.variations || []).some(v => modifiedStock[v.id] !== undefined);
        if (hasModifiedVar) {
          const updatedVars = (p.variations || []).map(v => ({
            ...v,
            stockQuantity: modifiedStock[v.id] !== undefined ? modifiedStock[v.id] : v.stockQuantity,
          }));

          const updatedProduct: Product = {
            ...p,
            variations: updatedVars,
          };

          updateProduct(updatedProduct);
          updatedProductsCount++;
        }
      }

      toast(
        language === 'ku'
          ? `ستۆکی ${updatedProductsCount} بەرهەم بە سەرکەوتوویی ڕێکخرایەوە ✅`
          : `Stock updated for ${updatedProductsCount} products ✅`
      );
      setModifiedStock({});
      onClose();
    } catch (err) {
      console.error('Failed to save bulk stock changes:', err);
      toast('Failed to save bulk stock changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const modifiedCount = Object.keys(modifiedStock).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-6 font-arabic animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {language === 'ku' ? 'ڕێکخستنەوەی کۆمەڵەیی ستۆکی ئایتمەکان' : language === 'ar' ? 'تعديل المخزون الجماعي' : 'Bulk Stock Restock & Adjustment'}
              </h3>
              <p className="text-xs font-bold text-slate-400">
                {language === 'ku' ? 'چەندین بەرهەم ڕێکبکەرەوە و ستۆک کەم یان زیاد بکە بە یەک هەنگاو' : 'Batch adjust stock quantities across multiple product variations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Batch Actions Toolbar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={L("Search products...")}
                className={`w-full ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'} py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500`}
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">{language === 'ku' ? 'هەموو بەشەکان' : language === 'ar' ? 'كل الأقسام' : 'All Categories'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {(language === 'ku' && c.nameKu) || (language === 'ar' && c.nameAr) || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Batch Increment Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
              {language === 'ku' ? 'زیادکردنی بە کۆمەڵ:' : 'Quick Batch:'}
            </span>
            <button
              onClick={() => handleBatchAdd(5)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              +5
            </button>
            <button
              onClick={() => handleBatchAdd(10)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              +10
            </button>
            <button
              onClick={() => handleBatchAdd(20)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              +20
            </button>
            {modifiedCount > 0 && (
              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title={language === 'ku' ? 'پاککردنەوە' : 'Reset'}
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'ڕێکخستنەوە' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Products & Variations Batch Editor List */}
        <div className="grow overflow-y-auto hide-scrollbar p-4 space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">
              {language === 'ku' ? 'هیچ بەرهەمێک نەدۆزرایەوە بەم فلتەرانە.' : 'No products match filters.'}
            </div>
          ) : (
            filteredProducts.map(product => {
              const variations = product.variations || [];
              const productName = (language === 'ku' && product.nameKu) || (language === 'ar' && product.nameAr) || product.name;

              return (
                <div key={product.id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3">
                  {/* Product Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imageUrl || 'https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&q=80&w=800'}
                        alt={productName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                      />
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{productName}</h4>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {product.barcode || product.sku || '—'}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-black text-indigo-600">
                      {formatIQDLabel(Number(product.discountPrice || product.price || 0))}
                    </span>
                  </div>

                  {/* Variations Stock Steppers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {variations.map(v => {
                      const currentStock = v.stockQuantity || 0;
                      const activeStock = modifiedStock[v.id] !== undefined ? modifiedStock[v.id] : currentStock;
                      const isModified = modifiedStock[v.id] !== undefined && modifiedStock[v.id] !== currentStock;
                      const hexColor = getColorHex(v.color || '');

                      return (
                        <div
                          key={v.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            isModified
                              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200/60'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {hexColor && (
                              <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: hexColor }} />
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-black block truncate">{v.size} {v.color ? `(${v.color})` : ''}</span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {language === 'ku' ? `کۆن: ${currentStock}` : `Prev: ${currentStock}`}
                              </span>
                            </div>
                          </div>

                          {/* Quantity Stepper Input */}
                          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shrink-0">
                            <button
                              onClick={() => handleStockChange(v.id, currentStock, -1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={activeStock}
                              onChange={(e) => handleStockInput(v.id, e.target.value)}
                              className="w-10 text-center text-xs font-black text-slate-900 bg-transparent outline-none font-mono"
                            />

                            <button
                              onClick={() => handleStockChange(v.id, currentStock, 1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Save Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="text-xs font-bold text-slate-600">
            {modifiedCount > 0 ? (
              <span className="text-amber-600 font-black">
                {language === 'ku' ? `⚡ ${modifiedCount} جۆر ڕێکخستنەوەی بۆ دەکرێت` : `⚡ ${modifiedCount} variations modified`}
              </span>
            ) : (
              <span>{language === 'ku' ? 'هیچ گۆڕانکارییەک نەکراوە' : 'No changes yet'}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-full font-bold text-xs transition-colors cursor-pointer"
            >
              {L("Cancel")}
            </button>

            <button
              disabled={modifiedCount === 0 || isSaving}
              onClick={handleSaveAll}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-full font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>
                {isSaving
                  ? (language === 'ku' ? 'خەریکی پاشەکەوتکردنە...' : 'Saving...')
                  : (language === 'ku' ? 'پاشەکەوتکردنی هەموو گۆڕانکارییەکان' : 'Save All Stock Adjustments')}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
