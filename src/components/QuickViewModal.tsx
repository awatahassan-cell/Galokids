import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'motion/react';
import { Product, ProductVariation } from '../types';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';
import { X, ShoppingCart, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  product: Product;
  onClose: () => void;
}

export const QuickViewModal: React.FC<Props> = ({ product, onClose }) => {
  const { addToCart } = useStore();
  const { t, language } = useLanguage();
  const variations = product.variations || [];
  const inStock = variations.filter(v => v.stockQuantity > 0);

  const colors = Array.from(new Set(inStock.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(inStock.map(v => v.size).filter(Boolean))) as string[];

  const [color, setColor] = useState<string>(colors[0] || '');
  const [size, setSize] = useState<string>(sizes[0] || '');
  const [added, setAdded] = useState(false);

  const getName = () => (language === 'ku' && product.nameKu) ? product.nameKu : (language === 'ar' && product.nameAr) ? product.nameAr : product.name;
  const isRTL = language === 'ar' || language === 'ku';

  const selectedVar: ProductVariation | undefined =
    inStock.find(v => (!color || v.color === color) && (!size || v.size === size)) || inStock[0];

  const price = Number(product.discountPrice || product.price || 0);

  const handleAdd = () => {
    if (!selectedVar) return;
    addToCart(product, selectedVar, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const modalContent = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-arabic" 
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 relative p-4 sm:p-6" 
        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-candy-500 hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="aspect-[4/5] max-h-64 sm:max-h-full bg-slate-50 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
            <img src={product.imageUrl} alt={getName()} className="w-full h-full object-cover object-center" />
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <span className="inline-block text-[10px] font-black uppercase text-bubble-700 bg-bubble-50 px-2.5 py-0.5 rounded-full mb-1.5 sm:mb-2">
                {t('quickView') || (language === 'ku' ? 'تێڕوانینی خێرا' : language === 'ar' ? 'نظرة سريعة' : 'Quick View')}
              </span>
              <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight mb-1.5">{getName()}</h2>
              
              <div className="flex items-center flex-wrap gap-2 mb-3 sm:mb-4">
                {product.discountPrice ? (
                  <>
                    <span className="text-xl sm:text-2xl font-black text-candy-700">{formatIQDLabel(Number(product.discountPrice))}</span>
                    <span className="text-xs sm:text-sm text-slate-400 line-through">{formatIQDLabel(Number(product.price))}</span>
                    <span className="bg-[#E0F7FA] text-[#00BFA5] border border-[#B2EBF2] font-black text-[10px] px-2 py-0.5 rounded-md font-arabic">
                      {language === 'ku' 
                        ? `داشکانی %${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}`
                        : language === 'ar'
                        ? `خصم %${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}`
                        : `-${Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}%`}
                    </span>
                  </>
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-slate-900">{formatIQDLabel(price)}</span>
                )}
              </div>

              {colors.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <p className="text-[11px] font-black text-slate-500 uppercase mb-1.5">{t('color') || 'Color'}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {colors.map(c => (
                      <button 
                        key={c} 
                        onClick={() => setColor(c)} 
                        title={getLocalizedColorName(c, language)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all cursor-pointer ${color === c ? 'border-candy-500 ring-2 ring-candy-200 scale-110' : 'border-slate-200'}`}
                        style={{ backgroundColor: getColorHex(c) }} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <p className="text-[11px] font-black text-slate-500 uppercase mb-1.5">{t('size') || 'Size'}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {sizes.map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSize(s)}
                        className={`px-2.5 py-1 text-[11px] sm:text-xs rounded-xl font-black border transition-all cursor-pointer ${size === s ? 'bg-candy-500 text-white border-candy-500 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {getLocalizedSizeName(s, language)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100">
              <button 
                onClick={handleAdd} 
                disabled={!selectedVar}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-candy-500 text-white font-black py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
              >
                {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                {added ? (t('added') || 'Added!') : (t('addToCart') || 'Add to Cart')}
              </button>
              <Link 
                to={`/product/${product.id}`} 
                onClick={onClose}
                className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0"
              >
                <span>{t('productDetails') || (language === 'ku' ? 'وردەکارییەکان' : language === 'ar' ? 'التفاصيل' : 'Details')}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
