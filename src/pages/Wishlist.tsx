import React from 'react';
import { useStore } from '../store';
import { ProductCard } from '../components/ProductCard';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const Wishlist: React.FC = () => {
  const { wishlist, products } = useStore();
  const { t } = useLanguage();
  
  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 fill-red-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          {t('yourWishlist')}
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {t('wishlistDesc')}
        </p>
      </div>

      {wishlistedProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlistedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <p className="text-xl font-medium text-slate-900 mb-2">{t('emptyWishlist')}</p>
          <p className="text-slate-500 mb-8 text-center max-w-md">
            {t('emptyWishlistDesc')}
          </p>
          <Link 
            to="/products"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {t('exploreProducts')}
          </Link>
        </div>
      )}
    </div>
  );
};
