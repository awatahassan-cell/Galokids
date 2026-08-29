import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { LANGUAGES, strings, type Language, type StringKey } from './strings';

const STORAGE_KEY = 'galokids.language';

interface LanguageValue {
  language: Language;
  isRTL: boolean;
  ready: boolean;
  /**
   * Whether the customer has ever picked a language themselves.
   *
   * Distinct from `language`, which always has a value — the phone's own
   * locale stands in until someone chooses. This is what tells the app it is
   * a first launch and the welcome screen is owed.
   */
  hasChosen: boolean;
  setLanguage: (next: Language) => void;
  /** Translate a key, optionally filling `{placeholders}`. */
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** Pick whichever of a record's localised fields matches the language. */
  pick: (ku?: string | null, ar?: string | null, en?: string | null) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Which language to start in when the customer has never chosen one.
 *
 * Kurdish is the shop's own language and the safest default for its
 * customers, but a phone set to Arabic or English says something, so that is
 * honoured before falling back.
 */
function deviceLanguage(): Language {
  const tag = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  if (tag === 'ar') return 'ar';
  if (tag === 'en') return 'en';
  return 'ku';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ku');
  const [hasChosen, setHasChosen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (!alive) return;
        const known = LANGUAGES.some(l => l.code === saved);
        setLanguageState(known ? (saved as Language) : deviceLanguage());
        setHasChosen(known);
      })
      .catch(() => {
        // Unreadable storage is treated as a first launch: showing the
        // welcome screen once too often is a smaller cost than never showing
        // it and leaving someone in a language they cannot read.
        if (alive) setLanguageState(deviceLanguage());
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const isRTL = language === 'ku' || language === 'ar';

  /**
   * Direction is handled by laying out in the writing direction rather than by
   * flipping the whole app.
   *
   * `I18nManager.forceRTL` only takes effect after a full restart, so calling
   * it when someone picks a language leaves the app half-flipped until they
   * kill it — the one thing worse than an un-flipped layout. Screens use
   * `writingDirection` and `flexDirection: row-reverse` instead, which apply
   * immediately.
   */
  useEffect(() => {
    if (I18nManager.allowRTL) I18nManager.allowRTL(false);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    setHasChosen(true);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // A phone that cannot write preferences still works; it just forgets,
      // and asks again next launch.
    });
  }, []);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      const entry = strings[key];
      let text = entry ? entry[language] : String(key);
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
        });
      }
      return text;
    },
    [language]
  );

  const pick = useCallback(
    (ku?: string | null, ar?: string | null, en?: string | null) => {
      if (language === 'ku') return ku || en || ar || '';
      if (language === 'ar') return ar || en || ku || '';
      return en || ku || ar || '';
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, isRTL, ready, hasChosen, setLanguage, t, pick }),
    [language, isRTL, ready, hasChosen, setLanguage, t, pick]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
