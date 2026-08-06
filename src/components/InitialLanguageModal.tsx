import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { KurdistanFlag, IraqFlag, UsaFlag } from './Flags';
import { Globe, Sparkles, Check } from 'lucide-react';
import { useStore } from '../store';

export const InitialLanguageModal: React.FC = () => {
  const { setLanguage } = useLanguage();
  const { storeSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kidskart_language');
    if (!saved) {
      setIsOpen(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('kidskart_language', lang);
    setIsOpen(false);
  };

  const languages: { code: Language; title: string; subtitle: string; Flag: React.FC<{ className?: string }> }[] = [
    {
      code: 'ku',
      title: 'کوردی',
      subtitle: 'بەرهەمەکان بە زمانی کوردی',
      Flag: KurdistanFlag,
    },
    {
      code: 'ar',
      title: 'العربية',
      subtitle: 'المنتجات باللغة العربية',
      Flag: IraqFlag,
    },
    {
      code: 'en',
      title: 'English',
      subtitle: 'Products in English language',
      Flag: UsaFlag,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
        {/* Top Decorative Background Glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-pink-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-sky-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative">
          <img 
            src={storeSettings?.store_logo || "/assets/galo-logo.png"} 
            alt="Galo Kids" 
            className="h-16 w-auto object-contain drop-shadow-sm" 
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-black tracking-wide border border-rose-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Galo Kids</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-arabic">
            تکایە زمانێک هەڵبژێرە
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-500 font-arabic">
            الرجاء اختيار اللغة / Please choose your language
          </p>
        </div>

        {/* Language Cards */}
        <div className="w-full space-y-3 pt-2">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelectLanguage(item.code)}
              className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/30 transition-all duration-200 flex items-center justify-between group active:scale-98 text-right font-arabic cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100 group-hover:scale-110 transition-transform">
                  <item.Flag className="w-7 h-7" />
                </div>
                <div className="text-right">
                  <h3 className="font-extrabold text-base text-slate-900 group-hover:text-rose-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-white border border-slate-200 group-hover:border-rose-500 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center text-transparent transition-all">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          ))}
        </div>

        <p className="text-[11px] font-bold text-slate-400 font-arabic">
          دەتوانیت دواتریش لە ڕێکخستنەکان زمان بگۆڕیت
        </p>
      </div>
    </div>
  );
};
