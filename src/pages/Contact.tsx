import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';
import { apiFetch } from '../config/api';

export const Contact: React.FC = () => {
  const { t, language } = useLanguage();
  const { storeSettings } = useStore();
  const isRTL = language === 'ar' || language === 'ku';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const emailValue = storeSettings.contact_email || 'hello@galokids.com';
  const phoneValue = storeSettings.store_phone || '+964 750 000 0000';
  const addressValue = storeSettings.store_address || t('officeAddress');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setErrorMsg(language === 'ku' ? 'تکایە ناو و دەقی پەیامەکەت بنووسە' : 'Please provide your name and message');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMsg(language === 'ku' ? 'تکایە ئیمەیڵ یان ژمارەی مۆبایل بنووسە بۆ وەڵامدانەوە' : 'Please provide an email or phone number');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/contact-messages', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error sending message');
      }

      const result = await res.json();
      setSuccessMsg(result.message || (language === 'ku' ? 'سوپاس بۆ پەیوەندیکردنت! پەیامەکەت بە سەرکەوتوویی گەیشت.' : 'Thank you! Your message has been sent successfully.'));
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err?.message || (language === 'ku' ? 'ناردنی نامە سەرکەوتوو نەبوو، تکایە دووبارە هەوڵ بدەرەوە.' : 'Failed to send message, please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

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
            <form className={`w-full space-y-4 ${isRTL ? 'text-right' : ''}`} onSubmit={handleSubmit}>
              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs font-bold text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p>{successMsg}</p>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-900 animate-in fade-in">
                  <p>{errorMsg}</p>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  {t('fullName')} <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-2xs" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    {language === 'ku' ? 'ژمارەی مۆبایل' : language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input 
                    type="tel" 
                    id="phone"
                    dir="ltr"
                    placeholder="0750XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-2xs" 
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    {t('emailAddress')}
                  </label>
                  <input 
                    type="email" 
                    id="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-2xs" 
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  {t('messageLabel')} <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  id="message" 
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-2xs resize-none"
                  placeholder={t('howCanWeHelp')}
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'ku' ? 'دەنێردرێت...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('sendMessage')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
