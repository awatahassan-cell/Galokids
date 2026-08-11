import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';

export const Contact: React.FC = () => {
  const { t, language } = useLanguage();
  const { storeSettings } = useStore();
  const isRTL = language === 'ar' || language === 'ku';

  const emailValue = storeSettings.contact_email || 'hello@galokids.com';
  const phoneValue = storeSettings.store_phone || '+964 750 000 0000';
  const addressValue = storeSettings.store_address || t('officeAddress');

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 ${isRTL ? 'font-arabic' : ''}`}>
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-grape-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-candy-50 rounded-full blur-3xl -ml-20 -mb-20 opacity-50 z-0 pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 relative z-10">
          <div className={`p-8 md:p-16 bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex flex-col justify-between ${isRTL ? 'text-right' : ''}`}>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display mb-6 tracking-tight">{t('sayHello')}</h1>
              <p className="text-sky-50 mb-12 text-lg md:text-xl font-bold leading-relaxed">
                {t('contactIntro')}
              </p>

              <div className="space-y-8">
                <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-md border border-white/30 shadow-sm">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('email')}</h3>
                    <p className="text-sky-100 font-medium">{emailValue}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-md border border-white/30 shadow-sm">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('phoneLabel')}</h3>
                    <p className="text-sky-100 font-medium" dir="ltr">{phoneValue}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-md border border-white/30 shadow-sm">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('officeLabel')}</h3>
                    <p className="text-sky-100 font-medium leading-tight">{addressValue}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-16 pt-8 border-t border-white/20">
              <p className="text-sm text-sky-100 font-bold">{t('support247')}</p>
            </div>
          </div>

          <div className="p-8 md:p-16 flex items-center">
            <form className={`w-full space-y-6 ${isRTL ? 'text-right' : ''}`} onSubmit={(e) => e.preventDefault()}>
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">{t('fullName')}</label>
                <input type="text" id="name"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">{t('emailAddress')}</label>
                <input type="email" id="email"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">{t('messageLabel')}</label>
                <textarea id="message" rows={5}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm resize-none"
                  placeholder={t('howCanWeHelp')}></textarea>
              </div>

              <button type="submit"
                className="w-full bg-grape-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0">
                {t('sendMessage')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
