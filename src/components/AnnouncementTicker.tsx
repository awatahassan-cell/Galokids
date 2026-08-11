import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * The scrolling promise strip above the header.
 *
 * The four messages are duplicated so the track can loop seamlessly: it slides
 * exactly one half of its width, at which point the second copy sits where the
 * first began and the jump back is invisible.
 */
export const AnnouncementTicker: React.FC = () => {
  const { language } = useLanguage();
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const messages = [
    L('🚚 گەیاندنی بێ بەرامبەر بۆ سەرووی ٥٠,٠٠٠ د.ع', '🚚 توصيل مجاني للطلبات فوق ٥٠,٠٠٠ د.ع', '🚚 Free delivery over 50,000 IQD'),
    L('↩️ گەڕاندنەوە تا ١٤ ڕۆژ', '↩️ إرجاع خلال ١٤ يوماً', '↩️ 14-day returns'),
    L('💵 پارەدان لە کاتی وەرگرتن', '💵 الدفع عند الاستلام', '💵 Cash on delivery'),
    L('🧵 ١٠٠٪ پەمبووی سروشتی', '🧵 ١٠٠٪ قطن طبيعي', '🧵 100% natural cotton'),
  ];

  return (
    <div className="bg-gradient-to-r from-candy-500 via-grape-500 to-bubble-500 text-[#3A1526] overflow-hidden relative z-[110] font-arabic">
      <div className="flex gap-11 py-2 whitespace-nowrap text-[12.5px] font-extrabold vk-ticker">
        {[...messages, ...messages].map((msg, i) => (
          <span key={i} className="inline-flex items-center gap-2 shrink-0">{msg}</span>
        ))}
      </div>
    </div>
  );
};
