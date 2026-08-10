import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const LOW = 5;

export const LowStockAlert: React.FC = () => {
  const { products } = useStore();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  const lowItems = useMemo(() => {
    return (products || [])
      .map(p => ({ p, stock: (p.variations || []).reduce((s, v) => s + (v.stockQuantity || 0), 0) }))
      .filter(x => x.stock <= LOW)
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  if (dismissed || lowItems.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <span className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </span>
      <div className="flex-grow">
        <p className="font-bold text-amber-800">
          {(t('lowStockAlert') || '{n} products are low on stock').replace('{n}', String(lowItems.length))}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {lowItems.slice(0, 8).map(({ p, stock }) => (
            <Link key={p.id} to={`/product/${p.id}`}
              className="text-xs font-bold bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full hover:bg-amber-100">
              {p.name} · {stock}
            </Link>
          ))}
          {lowItems.length > 8 && (
            <span className="text-xs font-bold text-amber-600 px-2.5 py-1">+{lowItems.length - 8}</span>
          )}
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-700 p-1 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
