import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Ruler } from 'lucide-react';

const rows = [
  { size: 'S', age: '0–6 m', height: '56–68 cm', weight: '3–8 kg' },
  { size: 'M', age: '6–12 m', height: '68–80 cm', weight: '8–11 kg' },
  { size: 'L', age: '1–2 y', height: '80–92 cm', weight: '11–14 kg' },
  { size: 'XL', age: '3–4 y', height: '92–104 cm', weight: '14–17 kg' },
  { size: '2XL', age: '5–6 y', height: '104–116 cm', weight: '17–21 kg' },
  { size: '3XL', age: '7–8 y', height: '116–128 cm', weight: '21–26 kg' },
];

export const SizeGuide: React.FC = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';
  return (
    <div className={`flex-grow max-w-3xl mx-auto w-full px-4 py-12 ${isRTL ? 'font-arabic text-right' : ''}`}>
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Ruler className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('sizeGuide') || 'Size Guide'}</h1>
        <p className="text-slate-500 mt-2">{t('sizeGuideDesc') || 'Find the right fit by your child’s age, height and weight.'}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-left">
              <th className="py-3 px-4 font-bold">{t('size') || 'Size'}</th>
              <th className="py-3 px-4 font-bold">{t('age') || 'Age'}</th>
              <th className="py-3 px-4 font-bold">{t('height') || 'Height'}</th>
              <th className="py-3 px-4 font-bold">{t('weight') || 'Weight'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.size} className="border-t border-slate-100">
                <td className="py-3 px-4 font-bold text-indigo-600">{r.size}</td>
                <td className="py-3 px-4 text-slate-700">{r.age}</td>
                <td className="py-3 px-4 text-slate-700">{r.height}</td>
                <td className="py-3 px-4 text-slate-700">{r.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">{t('sizeGuideNote') || 'Sizes are approximate. When in doubt, choose the larger size.'}</p>
    </div>
  );
};
