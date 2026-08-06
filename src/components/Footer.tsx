import React, { useState } from 'react';
import { Layers, Instagram, Facebook, Twitter, Mail, Phone, MapPin, ShieldCheck, CheckCircle2, ArrowRight, Video, Ghost } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';

export const Footer: React.FC = () => {
  const { t, language } = useLanguage();
  const { storeSettings } = useStore();
  const isRTL = language === 'ar' || language === 'ku';
  
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 5000);
    }
  };

  const phoneValue = storeSettings.store_phone || '+964 750 000 0000';
  const emailValue = storeSettings.contact_email || 'hello@galokids.com';
  const addressValue = storeSettings.store_address || t('officeAddress') || 'سلێمانی - كوردستان - عێراق';

  const socialLinks = [];
  if (storeSettings.instagram_url) {
    socialLinks.push({ icon: Instagram, href: storeSettings.instagram_url, label: 'Instagram', color: 'hover:text-pink-600 hover:bg-pink-50' });
  } else {
    socialLinks.push({ icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-600 hover:bg-pink-50' });
  }

  if (storeSettings.facebook_url) {
    socialLinks.push({ icon: Facebook, href: storeSettings.facebook_url, label: 'Facebook', color: 'hover:text-blue-600 hover:bg-blue-50' });
  } else {
    socialLinks.push({ icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-600 hover:bg-blue-50' });
  }

  if (storeSettings.tiktok_url) {
    socialLinks.push({ icon: Video, href: storeSettings.tiktok_url, label: 'TikTok', color: 'hover:text-black hover:bg-slate-100' });
  }
  
  if (storeSettings.snapchat_url) {
    socialLinks.push({ icon: Ghost, href: storeSettings.snapchat_url, label: 'Snapchat', color: 'hover:text-yellow-600 hover:bg-yellow-50' });
  }

  if (!storeSettings.tiktok_url && !storeSettings.snapchat_url) {
    socialLinks.push({ icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-sky-500 hover:bg-sky-50' });
  }

  return (
    <footer className="bg-white border-t border-slate-100 mt-20 pb-8 relative overflow-hidden">
      {/* Decorative Top Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 via-amber-300 to-sky-400"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          
          {/* Brand Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className={`flex items-center text-2xl font-black text-slate-900 tracking-tight gap-3 group relative inline-flex ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="bg-gradient-to-tr from-pink-400 via-amber-300 to-sky-400 text-white p-2.5 rounded-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-md border-2 border-white">
                <Layers className="w-5 h-5" />
              </div>
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent font-black tracking-wide drop-shadow-sm">
                Galo Kids <span className="text-xl">🎈</span>
              </span>
            </Link>
            
            <p className={`text-sm text-slate-500 leading-relaxed text-balance font-medium ${isRTL ? 'font-arabic' : ''}`}>
              {(t as any)('footerDesc') || 'Premium clothing and toys for little explorers. Curated with love, designed for adventure and everyday play.'}
            </p>

            {/* Contact Details */}
            <div className="space-y-3.5 pt-2">
              <div className={`flex items-center gap-3 text-slate-500 hover:text-slate-950 transition-colors text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className={isRTL ? 'font-arabic' : ''}>{addressValue}</span>
              </div>
              
              <div className={`flex items-center gap-3 text-slate-500 hover:text-slate-950 transition-colors text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <span dir="ltr">{phoneValue}</span>
              </div>

              <div className={`flex items-center gap-3 text-slate-500 hover:text-slate-950 transition-colors text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <span>{emailValue}</span>
              </div>
            </div>

            {/* Social Icons */}
            <div className={`flex items-center gap-3 pt-2 ${isRTL ? 'justify-start flex-row-reverse' : ''}`}>
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`p-2.5 bg-slate-50 hover:scale-110 text-slate-400 transition-all duration-200 rounded-xl border border-slate-100 ${social.color}`}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Column 1 (2 Cols) */}
          <div className="lg:col-span-2 lg:ml-6">
            <h3 className={`text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 ${isRTL ? 'font-arabic' : ''}`}>{t('explore')}</h3>
            <ul className="space-y-3.5">
              <li>
                <Link to="/products" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  {(t as any)('allProducts') || 'All Products'}
                </Link>
              </li>
              <li>
                <Link to="/about" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  {(t as any)('aboutUs') || 'About Us'}
                </Link>
              </li>
              <li>
                <Link to="/contact" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column 2 (2 Cols) */}
          <div className="lg:col-span-2">
            <h3 className={`text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 ${isRTL ? 'font-arabic' : ''}`}>{(t as any)('support') || 'Support'}</h3>
            <ul className="space-y-3.5">
              <li>
                <Link to="/faq" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  {t('shippingReturns')}
                </Link>
              </li>
              <li>
                <Link to="/track" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  {(t as any)('trackOrder') || 'Track Order'}
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className={`text-sm text-slate-600 hover:text-indigo-600 hover:translate-x-1 font-semibold transition-all inline-block ${isRTL ? 'font-arabic hover:-translate-x-1' : ''}`}>
                  {(t as any)('sizeGuide') || 'Size Guide'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-4">
              <h3 className={`text-sm font-bold text-slate-900 uppercase tracking-wider ${isRTL ? 'font-arabic' : ''}`}>
                {(t as any)('stayUpdated') || 'Stay Updated'}
              </h3>
              <p className={`text-xs text-slate-500 leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>
                {(t as any)('newsletterDesc') || 'Join our newsletter for exclusive offers, special kid events, and fresh arrivals.'}
              </p>
              
              {isSubscribed ? (
                <div className={`flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold animate-fade-in ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className={isRTL ? 'font-arabic' : ''}>
                    {(t as any)('subscribedSuccess') || 'Awesome! You have been successfully subscribed. 🎉'}
                  </span>
                </div>
              ) : (
                <form className="space-y-2.5" onSubmit={handleSubscribe}>
                  <div className="relative flex items-center">
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={(t as any)('yourEmail') || 'Your email address'}
                      className={`w-full bg-white border border-slate-200 rounded-xl py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-800 ${
                        isRTL ? 'pr-4 pl-12 text-right font-arabic' : 'pl-4 pr-12'
                      }`}
                    />
                    <button 
                      type="submit"
                      aria-label="Submit subscription"
                      className={`absolute ${isRTL ? 'left-1.5' : 'right-1.5'} p-2 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 transition-all hover:scale-105 active:scale-95`}
                    >
                      <ArrowRight className={`w-4 h-4 transform ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Trust and Safety Badges */}
            <div className={`flex items-center gap-3.5 p-4 bg-indigo-50/40 border border-indigo-100/40 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
              <ShieldCheck className="w-7 h-7 text-indigo-500 shrink-0" />
              <div>
                <h4 className={`text-xs font-bold text-indigo-950 ${isRTL ? 'font-arabic' : ''}`}>{(t as any)('secureShopping') || 'Secure Shopping Guarantee'}</h4>
                <p className={`text-[11px] text-indigo-600 font-medium ${isRTL ? 'font-arabic' : ''}`}>{(t as any)('secureShoppingDesc') || 'SSL encrypted connection & safe checkout'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="border-t border-slate-100 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className={`flex flex-col md:flex-row items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <p className={`text-sm text-slate-400 font-semibold text-center md:text-left ${isRTL ? 'font-arabic' : ''}`}>
              {(t as any)('copyright') || `© ${new Date().getFullYear()} Galo Kids. All rights reserved.`}
            </p>
            <div className={`flex space-x-6 text-xs text-slate-400 font-semibold ${isRTL ? 'font-arabic space-x-reverse' : ''}`}>
              <a href="#" className="hover:text-slate-900 transition-colors">{(t as any)('privacyPolicy') || 'Privacy Policy'}</a>
              <span className="text-slate-200">|</span>
              <a href="#" className="hover:text-slate-900 transition-colors">{(t as any)('termsOfService') || 'Terms of Service'}</a>
            </div>
          </div>


        </div>

      </div>
    </footer>
  );
};

