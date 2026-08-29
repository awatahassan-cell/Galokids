import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCategories, fetchSettings } from '../api/endpoints';
import type { Category, StoreSettings } from '../api/types';

const CACHE_KEY = 'galokids.shop.cache';

interface ShopValue {
  categories: Category[];
  settings: StoreSettings;
  loading: boolean;
  /** True once either the cache or the network has produced something. */
  hydrated: boolean;
  refresh: () => Promise<void>;
}

const ShopContext = createContext<ShopValue | null>(null);

/**
 * The shop itself: its categories, and everything an admin can change about
 * how it presents itself — name, logo, banners, delivery charges, socials.
 *
 * Read from the server on every launch, so a banner changed in the admin
 * panel is the banner the app shows. The last answer is cached, and shown
 * first, so opening the app on a slow connection does not mean staring at a
 * blank screen while the network decides.
 */
export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCategories, nextSettings] = await Promise.all([
        fetchCategories(),
        fetchSettings(),
      ]);

      setCategories(nextCategories);
      setSettings(nextSettings);
      setHydrated(true);

      AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ categories: nextCategories, settings: nextSettings })
      ).catch(() => {
        // Only a cache; the next launch simply waits for the network.
      });
    } catch {
      // Keep whatever is on screen. An unreachable server should not empty
      // the shop the customer was already looking at.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    AsyncStorage.getItem(CACHE_KEY)
      .then(raw => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.categories)) setCategories(parsed.categories);
        if (parsed?.settings && typeof parsed.settings === 'object') setSettings(parsed.settings);
        setHydrated(true);
      })
      .catch(() => {
        // A missing or unreadable cache is the normal first-launch case.
      })
      .finally(() => {
        if (alive) refresh();
      });

    return () => {
      alive = false;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ categories, settings, loading, hydrated, refresh }),
    [categories, settings, loading, hydrated, refresh]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export function useShop(): ShopValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}
