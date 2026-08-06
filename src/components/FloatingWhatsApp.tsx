import React from 'react';
import { whatsappLink } from '../utils/whatsapp';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';

export const FloatingWhatsApp: React.FC = () => {
  const { t, language } = useLanguage();
  const { storeSettings } = useStore();
  const isRTL = language === 'ar' || language === 'ku';
  
  const whatsappNum = storeSettings.whatsapp_number;
  const href = whatsappLink(
    language === 'ku' ? 'سڵاو، هاوکاریم بکەن 🙂' :
    language === 'ar' ? 'مرحباً، أحتاج مساعدة 🙂' :
    'Hi Galo Kids, I need some help 🙂',
    whatsappNum
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      title={t('chatOnWhatsApp') || 'Chat on WhatsApp'}
      className={`fixed bottom-20 md:bottom-5 z-40 ${isRTL ? 'left-5' : 'right-5'} flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 active:scale-95 transition-transform`}
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7 fill-current" aria-hidden="true">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.49 1.125 6.727 3.04 9.36L1.05 31.29l6.13-1.96A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.318 22.594c-.386 1.09-1.918 1.994-3.14 2.258-.836.178-1.928.32-5.604-1.204-4.7-1.948-7.726-6.724-7.962-7.034-.226-.31-1.9-2.53-1.9-4.826 0-2.296 1.166-3.424 1.636-3.904.386-.394.844-.574 1.34-.574.16 0 .306.008.436.014.386.016.58.038.834.646.316.762 1.088 2.658 1.18 2.848.094.19.156.412.03.664-.118.26-.222.376-.412.598-.19.222-.37.392-.56.63-.174.206-.37.428-.152.806.218.37.968 1.594 2.078 2.58 1.432 1.276 2.618 1.67 3.036 1.844.31.128.68.098.906-.15.286-.31.64-.826 1-1.334.254-.362.574-.408.912-.28.344.12 2.174 1.026 2.548 1.212.374.186.622.276.714.432.09.156.09.898-.296 1.99z" />
      </svg>
    </a>
  );
};
