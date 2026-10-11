import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Ruler } from 'lucide-react';

const rows = [
  { size: '1-2', age: '1–2 y', height: '80–92 cm', weight: '10–13 kg' },
  { size: '2-3', age: '2–3 y', height: '92–98 cm', weight: '13–15 kg' },
  { size: '3-4', age: '3–4 y', height: '98–104 cm', weight: '15–17 kg' },
  { size: '4-5', age: '4–5 y', height: '104–110 cm', weight: '17–19 kg' },
  { size: '5-6', age: '5–6 y', height: '110–116 cm', weight: '19–22 kg' },
  { size: '6-7', age: '6–7 y', height: '116–122 cm', weight: '22–25 kg' },
  { size: '8-9', age: '8–9 y', height: '128–134 cm', weight: '28–32 kg' },
];

export const SizeGuide: React.FC = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ku';
  return (
    <div className={`flex-grow max-w-3xl mx-auto w-full px-4 py-12 ${isRTL ? 'font-arabic text-right' : ''}`}>
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-bubble-100 text-bubble-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                <td className="py-3 px-4 font-bold text-grape-700">{r.size}</td>
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
