import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export const About: React.FC = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(14,165,233,0.15)] border border-sky-50 p-8 md:p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-sky-200 rounded-full blur-3xl -mr-20 -mt-20 opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-200 rounded-full blur-3xl -ml-20 -mb-20 opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-20"></div>

        <div className={`relative z-10 text-center ${isRTL ? 'font-arabic' : ''}`}>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display text-slate-900 mb-8 tracking-tight">
            {t('aboutTitle')} <span className="bg-gradient-to-r from-sky-500 to-rose-400 bg-clip-text text-transparent">Galo Kids</span>
          </h1>
          <div className="space-y-6 text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
            <p>{t('aboutP1')}</p>
            <p>{t('aboutP2')}</p>
            <p>{t('aboutP3')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
