import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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
    <div 
      className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-arabic" 
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 relative animate-in fade-in zoom-in duration-200" 
        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 sm:p-8">
          <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
            <img src={product.imageUrl} alt={getName()} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <span className="inline-block text-[10px] font-black uppercase text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full mb-2">
                Quick View
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-2">{getName()}</h2>
              
              <div className="flex items-baseline gap-2 mb-4">
                {product.discountPrice ? (
                  <>
                    <span className="text-2xl font-black text-rose-500">{formatIQDLabel(Number(product.discountPrice))}</span>
                    <span className="text-sm text-slate-400 line-through">{formatIQDLabel(Number(product.price))}</span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-slate-900">{formatIQDLabel(price)}</span>
                )}
              </div>

              {colors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-black text-slate-500 uppercase mb-2">{t('color')}</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button 
                        key={c} 
                        onClick={() => setColor(c)} 
                        title={getLocalizedColorName(c, language)}
                        className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${color === c ? 'border-rose-500 ring-2 ring-rose-200 scale-110' : 'border-slate-200'}`}
                        style={{ backgroundColor: getColorHex(c) }} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-black text-slate-500 uppercase mb-2">{t('size')}</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSize(s)}
                        className={`px-3 py-1.5 text-xs rounded-xl font-black border transition-all cursor-pointer ${size === s ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {getLocalizedSizeName(s, language)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button 
                onClick={handleAdd} 
                disabled={!selectedVar}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-500 text-white font-black py-3 rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
              >
                {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                {added ? (t('added') || 'Added!') : (t('addToCart') || 'Add to Cart')}
              </button>
              <Link 
                to={`/product/${product.id}`} 
                onClick={onClose}
                className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <span>{t('productDetails') || 'Details'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
