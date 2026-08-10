import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations } from './translations';
import { API_BASE_URL } from '../config/api';

type Overrides = Record<Language, Record<string, string>>;

const EMPTY_OVERRIDES: Overrides = { en: {}, ku: {}, ar: {} };

/** Key used in the backend `settings` table. */
const OVERRIDES_SETTING_KEY = 'translation_overrides';
const OVERRIDES_CACHE_KEY = 'kidskart_translations_overrides';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  dir: 'ltr' | 'rtl';
  /** Edit one string locally. Call `publishTranslations` to make it live for everyone. */
  updateTranslation: (lang: Language, key: string, value: string) => void;
  /** Save every local edit to the server so all visitors get them. */
  publishTranslations: () => Promise<{ success: boolean; message?: string }>;
  /** Throw away local edits and reload whatever the server has. */
  resetTranslations: () => Promise<void>;
  /** True when there are local edits that have not been published yet. */
  hasUnpublishedTranslations: boolean;
  allTranslations: typeof translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const readCachedOverrides = (): Overrides => {
  try {
    const saved = localStorage.getItem(OVERRIDES_CACHE_KEY);
    if (!saved) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(saved);
    return { ...EMPTY_OVERRIDES, ...parsed };
  } catch {
    return EMPTY_OVERRIDES;
  }
};

const sameOverrides = (a: Overrides, b: Overrides) => JSON.stringify(a) === JSON.stringify(b);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('kidskart_language');
    return (saved as Language) || 'en';
  });

  // `overrides` is what the UI renders. `publishedOverrides` is the last copy
  // known to be on the server; the difference between them is the admin's
  // unsaved draft. The localStorage copy is an offline cache of the PUBLISHED
  // values only — drafts stay in memory so a reload never resurrects them.
  const [overrides, setOverrides] = useState<Overrides>(readCachedOverrides);
  const [publishedOverrides, setPublishedOverrides] = useState<Overrides>(readCachedOverrides);
  const hasLocalEdits = !sameOverrides(overrides, publishedOverrides);

  useEffect(() => {
    localStorage.setItem('kidskart_language', language);
    document.documentElement.dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Translation edits are stored on the server (in the `settings` table) so an
   * admin's wording changes reach every visitor. They used to live only in the
   * editing browser's localStorage, where nobody else could ever see them.
   */
  const loadFromServer = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;

      const data = await res.json();
      const remote = data?.[OVERRIDES_SETTING_KEY];
      if (!remote || typeof remote !== 'object') return;

      const merged: Overrides = {
        en: remote.en || {},
        ku: remote.ku || {},
        ar: remote.ar || {},
      };

      setPublishedOverrides(prevPublished => {
        // Adopt the server copy unless the admin is in the middle of editing —
        // their unsaved draft must not be overwritten underneath them.
        setOverrides(current => (sameOverrides(current, prevPublished) ? merged : current));
        return merged;
      });

      localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify(merged));
    } catch (err) {
      console.warn('Could not load translations from the server:', err);
    }
  }, []);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  const updateTranslation = (lang: Language, key: string, value: string) => {
    // Draft only — nothing is written to the cache until it is published, so a
    // half-finished edit can never be mistaken for the live wording.
    setOverrides(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [key]: value },
    }));
  };

  const publishTranslations = async (): Promise<{ success: boolean; message?: string }> => {
    const token = localStorage.getItem('kidskart_auth_token');
    if (!token) {
      return { success: false, message: 'Not signed in.' };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [OVERRIDES_SETTING_KEY]: overrides }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        return { success: false, message: body?.message };
      }

      setPublishedOverrides(overrides);
      localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
      return { success: true };
    } catch (err) {
      console.warn('Could not publish translations:', err);
      return { success: false };
    }
  };

  const resetTranslations = async () => {
    setOverrides(publishedOverrides);
    await loadFromServer();
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
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        updateTranslation,
        publishTranslations,
        resetTranslations,
        hasUnpublishedTranslations: hasLocalEdits,
        allTranslations,
      }}
    >
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
