import React, { useMemo } from 'react';
import { useStore } from '../store';
import { STANDARD_COLORS, STANDARD_SIZES } from '../data';
import { Filter, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { CategoryIcon } from './CategoryIcon';

export interface FilterState {
  categoryId: string | null;
  gender: number | null;
  colors: string[];
  sizes: string[];
  inStockOnly: boolean;
  minPrice?: string;
  maxPrice?: string;
}

interface ProductFilterProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  isOpen: boolean;
  onClose: () => void;
  onClearAll?: () => void;
}

export const ProductFilter: React.FC<ProductFilterProps> = ({ filters, setFilters, isOpen, onClose, onClearAll }) => {
  const { categories, products } = useStore();
  const { t, language } = useLanguage();

  const COLORS = STANDARD_COLORS;
  const SIZES = STANDARD_SIZES;

  const getCategoryName = (category: any) => {
    if (language === 'ku' && category.nameKu) return category.nameKu;
    if (language === 'ar' && category.nameAr) return category.nameAr;
    return category.name;
  };

  const toggleColor = (color: string) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(color) 
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const toggleSize = (size: string) => {
    setFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const isRTL = language === 'ar' || language === 'ku';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Filter Sidebar */}
      <div className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'right-0'} w-80 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 lg:z-auto ${isRTL ? 'border-l' : 'border-l'} lg:border-none lg:border-slate-200 overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          <div className={`flex items-center justify-between mb-8 lg:hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className={`text-lg font-bold text-slate-900 flex items-center ${isRTL ? 'font-arabic' : ''}`}>
              <Filter className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} /> {t('filters')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Categories */}
          <div className="mb-8">
            <h3 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('categories')}</h3>
            <div className="space-y-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, categoryId: null }))}
                className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${
                  filters.categoryId === null 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <span className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
                  <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                    <Filter className="w-4 h-4" />
                  </span>
                  {t('all')}
                </span>
                {filters.categoryId === null && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                )}
              </button>
              {categories.map(category => (
                <button
                  key={category?.id}
                  onClick={() => setFilters(prev => ({ ...prev, categoryId: category?.id }))}
                  className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between group ${
                    filters.categoryId === category?.id 
                      ? 'bg-indigo-50 text-indigo-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <span className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border transition-colors ${
                      filters.categoryId === category?.id 
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                        : 'bg-white border-slate-100 text-slate-400 group-hover:text-slate-600 group-hover:border-slate-200'
                    }`}>
                      <CategoryIcon name={category.icon} />
                    </span>
                    {getCategoryName(category)}
                  </span>
                  {filters.categoryId === category?.id && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="mb-8">
            <h3 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('gender')}</h3>
            <div className="space-y-2">
              {[
                { value: 0, label: t('both') || 'Both' },
                { value: 1, label: t('boy') || 'Boy' },
                { value: 2, label: t('girl') || 'Girl' },
              ].map(gender => (
                <button
                  key={gender.value}
                  onClick={() => setFilters(prev => ({ ...prev, gender: prev.gender === gender.value ? null : gender.value }))}
                  className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${
                    filters.gender === gender.value 
                      ? 'bg-rose-50 text-rose-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <span className={`capitalize ${isRTL ? 'font-arabic' : ''}`}>{gender.label}</span>
                  {filters.gender === gender.value && (
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="mb-8">
            <h3 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('color')}</h3>
            <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    filters.colors.includes(color) 
                      ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2 scale-110' 
                      : 'border-slate-200 hover:scale-110 shadow-sm'
                  }`}
                  style={{ backgroundColor: getColorHex(color) }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <h3 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('size')}</h3>
            <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                    filters.sizes.includes(size)
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-8">
            <h3 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('price') || 'Price'}</h3>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={t('min') || 'Min'}
                value={filters.minPrice ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-400">–</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={t('max') || 'Max'}
                value={filters.maxPrice ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Availability */}
          <div className="mb-8">
            <h3 className={`text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('availability') || 'Availability'}</h3>
            <label className={`flex items-center cursor-pointer ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
              <input 
                type="checkbox" 
                checked={filters.inStockOnly}
                onChange={(e) => setFilters(prev => ({ ...prev, inStockOnly: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className={`text-sm text-slate-700 ${isRTL ? 'font-arabic' : ''}`}>{t('inStockOnly')}</span>
            </label>
          </div>

          <button 
            onClick={onClearAll || (() => setFilters({ categoryId: null, gender: null, colors: [], sizes: [], inStockOnly: false, minPrice: '', maxPrice: '' }))}
            className={`w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ${isRTL ? 'font-arabic' : ''}`}
          >
            {t('clearFilters')}
          </button>
        </div>
      </div>
    </>
  );
};
