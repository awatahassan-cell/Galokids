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

      {/* Clothing Table */}
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-800 mb-2">
          {language === 'ku' ? 'ڕێبەری سایزی جلوبەرگ' : language === 'ar' ? 'دليل مقاسات الملابس' : 'Clothing Size Guide'}
        </h2>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-10">
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

      {/* Shoes Table */}
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-800 mb-2">
          {language === 'ku' ? 'ڕێبەری سایزی پێڵاو (20 - 38)' : language === 'ar' ? 'دليل مقاسات الأحذية (20 - 38)' : 'Shoe Size Guide (EU 20 - 38)'}
        </h2>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-left">
              <th className="py-3 px-4 font-bold">{language === 'ku' ? 'قەبارەی پێڵاو (EU)' : language === 'ar' ? 'مقاس الحذاء (EU)' : 'Shoe Size (EU)'}</th>
              <th className="py-3 px-4 font-bold">{t('age') || 'Age'}</th>
              <th className="py-3 px-4 font-bold">{language === 'ku' ? 'درێژی پێ (Foot Length)' : language === 'ar' ? 'طول القدم' : 'Foot Length'}</th>
            </tr>
          </thead>
          <tbody>
            {[
              { size: '20', age: '1–1.5 y', footLength: '12.3 cm' },
              { size: '21', age: '1.5–2 y', footLength: '13.0 cm' },
              { size: '22', age: '2 y', footLength: '13.7 cm' },
              { size: '23', age: '2–2.5 y', footLength: '14.3 cm' },
              { size: '24', age: '2.5–3 y', footLength: '15.0 cm' },
              { size: '25', age: '3 y', footLength: '15.7 cm' },
              { size: '26', age: '3–3.5 y', footLength: '16.3 cm' },
              { size: '27', age: '3.5–4 y', footLength: '17.0 cm' },
              { size: '28', age: '4–4.5 y', footLength: '17.7 cm' },
              { size: '29', age: '4.5–5 y', footLength: '18.3 cm' },
              { size: '30', age: '5–5.5 y', footLength: '19.0 cm' },
              { size: '31', age: '5.5–6 y', footLength: '19.7 cm' },
              { size: '32', age: '6–6.5 y', footLength: '20.3 cm' },
              { size: '33', age: '6.5–7 y', footLength: '21.0 cm' },
              { size: '34', age: '7–7.5 y', footLength: '21.7 cm' },
              { size: '35', age: '7.5–8 y', footLength: '22.3 cm' },
              { size: '36', age: '8–9 y', footLength: '23.0 cm' },
              { size: '37', age: '9–10 y', footLength: '23.7 cm' },
              { size: '38', age: '10–12 y', footLength: '24.3 cm' },
            ].map(r => (
              <tr key={r.size} className="border-t border-slate-100">
                <td className="py-3 px-4 font-bold text-grape-700">{r.size}</td>
                <td className="py-3 px-4 text-slate-700">{r.age}</td>
                <td className="py-3 px-4 text-slate-700">{r.footLength}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">{t('sizeGuideNote') || 'Sizes are approximate. When in doubt, choose the larger size.'}</p>
    </div>
  );
};
