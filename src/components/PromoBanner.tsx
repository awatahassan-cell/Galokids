import React from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

export const PromoBanner: React.FC = () => {
  const { promoBanner } = useStore();
  const { language } = useLanguage();

  if (!promoBanner.isActive) return null;

  const getTitle = () => {
    if (language === 'ku') return promoBanner.titleKu;
    if (language === 'ar') return promoBanner.titleAr;
    return promoBanner.titleEn;
  };

  const getSubtitle = () => {
    if (language === 'ku') return promoBanner.subtitleKu;
    if (language === 'ar') return promoBanner.subtitleAr;
    return promoBanner.subtitleEn;
  };

  return (
    <div className="relative bg-fuchsia-500 text-white overflow-hidden rounded-[2.5rem] shadow-xl mb-8 group">
      {promoBanner.imageUrl && (
        <div className="absolute inset-0">
          <img 
            src={promoBanner.imageUrl} 
            alt="Promo Banner" 
            className="w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-700 ease-in-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-600/90 to-transparent"></div>
        </div>
      )}
      <div className="relative px-6 py-16 md:py-24 md:px-12 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold font-display tracking-tight mb-4 text-white drop-shadow-lg leading-tight">
          {getTitle()}
        </h2>
        <p className="text-xl md:text-3xl text-fuchsia-50 max-w-2xl drop-shadow-md font-bold">
          {getSubtitle()}
        </p>
      </div>
    </div>
  );
};
