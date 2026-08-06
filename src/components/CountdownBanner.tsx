import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { Clock } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');

export const CountdownBanner: React.FC = () => {
  const { promoBanner } = useStore();
  const { t, language } = useLanguage();
  const end = (promoBanner as any)?.endDate ? new Date((promoBanner as any).endDate).getTime() : 0;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!end) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);

  if (!promoBanner?.isActive || !end || end <= now) return null;

  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const label =
    language === 'ku' ? 'داشکاندنەکە کۆتایی دێت لە' :
    language === 'ar' ? 'ينتهي العرض خلال' :
    'Offer ends in';

  const box = (val: string, unit: string) => (
    <div className="flex flex-col items-center">
      <span className="bg-white/20 text-white font-black rounded-lg px-2.5 py-1 text-lg tabular-nums min-w-[42px] text-center">{val}</span>
      <span className="text-[10px] text-white/80 mt-1 uppercase">{unit}</span>
    </div>
  );

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 px-5 py-3 flex flex-wrap items-center justify-center gap-4 shadow-md">
      <span className="inline-flex items-center gap-2 text-white font-bold">
        <Clock className="w-5 h-5" /> {label}
      </span>
      <div className="flex items-center gap-2">
        {d > 0 && <>{box(String(d), t('days') || 'days')}<span className="text-white font-black">:</span></>}
        {box(pad(h), t('hrs') || 'hrs')}
        <span className="text-white font-black">:</span>
        {box(pad(m), t('min') || 'min')}
        <span className="text-white font-black">:</span>
        {box(pad(s), t('sec') || 'sec')}
      </div>
    </div>
  );
};
