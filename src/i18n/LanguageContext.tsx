import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  dir: 'ltr' | 'rtl';
  updateTranslation: (lang: Language, key: string, value: string) => void;
  allTranslations: typeof translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('kidskart_language');
    return (saved as Language) || 'en';
  });

  const [overrides, setOverrides] = useState<any>(() => {
    const saved = localStorage.getItem('kidskart_translations_overrides');
    return saved ? JSON.parse(saved) : { en: {}, ku: {}, ar: {} };
  });

  useEffect(() => {
    localStorage.setItem('kidskart_language', language);
    document.documentElement.dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const updateTranslation = (lang: Language, key: string, value: string) => {
    const newOverrides = {
      ...overrides,
      [lang]: {
        ...overrides[lang],
        [key]: value
      }
    };
    setOverrides(newOverrides);
    localStorage.setItem('kidskart_translations_overrides', JSON.stringify(newOverrides));
  };

  const allTranslations = {
    en: { ...translations.en, ...overrides.en },
    ku: { ...translations.ku, ...overrides.ku },
    ar: { ...translations.ar, ...overrides.ar }
  } as typeof translations;

  const t = (key: keyof typeof translations.en) => {
    return allTranslations[language][key] || allTranslations.en[key] || key;
  };

  const dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, updateTranslation, allTranslations }}>
      <div dir={dir} className={dir === 'rtl' ? 'font-arabic text-right' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
