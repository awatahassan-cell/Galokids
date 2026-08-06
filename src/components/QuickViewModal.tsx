import React, { useState } from 'react';
import { Product, ProductVariation } from '../types';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { getColorHex } from '../utils/colors';
import { formatIQDLabel } from '../utils/currency';
import { X, ShoppingCart, Check } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden ${isRTL ? 'font-arabic' : ''}`} onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
        <div className="flex justify-end p-2">
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 pt-0 ${isRTL ? 'sm:[direction:rtl]' : ''}`}>
          <img src={product.imageUrl} alt={getName()} className="w-full h-64 object-cover rounded-xl" />
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{getName()}</h2>
            <div className="flex items-center gap-2 mb-4">
              {product.discountPrice ? (
                <>
                  <span className="text-slate-400 line-through">{formatIQDLabel(Number(product.price))}</span>
                  <span className="text-2xl font-black text-rose-500">{formatIQDLabel(Number(product.discountPrice))}</span>
                </>
              ) : (
                <span className="text-2xl font-black text-slate-900">{formatIQDLabel(price)}</span>
              )}
            </div>

            {colors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">{t('color')}</p>
                <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {colors.map(c => (
                    <button key={c} onClick={() => setColor(c)} title={c}
                      className={`w-7 h-7 rounded-full border-2 transition ${color === c ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-200'}`}
                      style={{ backgroundColor: getColorHex(c) }} />
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">{t('size')}</p>
                <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {sizes.map(s => (
                    <button key={s} onClick={() => setSize(s)}
                      className={`px-3 py-1.5 text-xs rounded border font-medium transition ${size === s ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-slate-600 border-slate-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={handleAdd} disabled={!selectedVar}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {added ? (t('added') || 'Added!') : (t('addToCart') || 'Add to Cart')}
              </button>
              <Link to={`/product/${product.id}`} onClick={onClose}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                {t('productDetails') || 'Details'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
