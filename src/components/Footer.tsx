import React, { useState } from 'react';
import { 
  Layers, Instagram, Facebook, Mail, Phone, MapPin, 
  ShieldCheck, CheckCircle2, ArrowRight, Video, Ghost, 
  Truck, RefreshCw, Award, Headphones, MessageSquare, Heart, Sparkles, CreditCard, Send,
  Package, Info, PhoneCall, HelpCircle, Compass, Ruler
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';

export const Footer: React.FC = () => {
  const { language } = useLanguage();
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
  const cleanPhone = phoneValue.replace(/[^\d+]/g, '');
  const emailValue = storeSettings.contact_email || 'hello@galokids.com';
  const addressValue = storeSettings.store_address || (
    language === 'ku' ? 'سلێمانی - كوردستان - عێراق' : language === 'ar' ? 'السليمانية - كوردستان - العراق' : 'Sulaymaniyah, Kurdistan, Iraq'
  );

  const socialLinks = [];
  if (storeSettings.instagram_url) {
    socialLinks.push({ icon: Instagram, href: storeSettings.instagram_url, label: 'Instagram', hoverColor: 'hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:text-white' });
  } else {
    socialLinks.push({ icon: Instagram, href: '#', label: 'Instagram', hoverColor: 'hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:text-white' });
  }

  if (storeSettings.facebook_url) {
    socialLinks.push({ icon: Facebook, href: storeSettings.facebook_url, label: 'Facebook', hoverColor: 'hover:bg-blue-600 hover:text-white' });
  } else {
    socialLinks.push({ icon: Facebook, href: '#', label: 'Facebook', hoverColor: 'hover:bg-blue-600 hover:text-white' });
  }

  if (storeSettings.tiktok_url) {
    socialLinks.push({ icon: Video, href: storeSettings.tiktok_url, label: 'TikTok', hoverColor: 'hover:bg-slate-900 hover:text-white' });
  }

  if (storeSettings.snapchat_url) {
    socialLinks.push({ icon: Ghost, href: storeSettings.snapchat_url, label: 'Snapchat', hoverColor: 'hover:bg-yellow-400 hover:text-slate-900' });
  }

  return (
    <footer className="bg-gradient-to-b from-rose-50/40 via-white to-amber-50/30 text-slate-700 mt-16 relative overflow-hidden font-arabic border-t border-rose-100/80 shadow-xs">
      
      {/* Top Colorful Brand Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-400 via-amber-400 via-emerald-400 to-sky-400"></div>

      {/* 1. Value Proposition Highlights Bar (Centred on mobile) */}
      <div className="border-b border-rose-100/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Feature 1 */}
            <div className={`flex flex-col sm:flex-row items-center text-center gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100/80 transition-all hover:bg-rose-50 ${isRTL ? 'sm:text-right sm:flex-row-reverse' : 'sm:text-left'}`}>
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate">
                  {language === 'ku' ? 'گەیاندنی خێرا' : language === 'ar' ? 'توصيل سريع' : 'Fast Delivery'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                  {language === 'ku' ? 'بۆ سەرجەم شارەکان' : language === 'ar' ? 'لكافة المحافظات' : 'To all cities'}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className={`flex flex-col sm:flex-row items-center text-center gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 transition-all hover:bg-amber-50 ${isRTL ? 'sm:text-right sm:flex-row-reverse' : 'sm:text-left'}`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate">
                  {language === 'ku' ? 'کواڵیتی مسۆگەر' : language === 'ar' ? 'جودة مضمونة' : 'Guaranteed Quality'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                  {language === 'ku' ? 'باشترین پۆشاک و یاری' : language === 'ar' ? 'أفضل الملابس والألعاب' : 'Best kids apparel'}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className={`flex flex-col sm:flex-row items-center text-center gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 transition-all hover:bg-emerald-50 ${isRTL ? 'sm:text-right sm:flex-row-reverse' : 'sm:text-left'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate">
                  {language === 'ku' ? 'گۆڕینەوەی ئاسان' : language === 'ar' ? 'استبدال سهل' : 'Easy Exchange'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                  {language === 'ku' ? 'تا ٧ ڕۆژ دوای وەرگرتن' : language === 'ar' ? 'خلال ٧ أيام' : 'Within 7 days'}
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className={`flex flex-col sm:flex-row items-center text-center gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100/80 transition-all hover:bg-sky-50 ${isRTL ? 'sm:text-right sm:flex-row-reverse' : 'sm:text-left'}`}>
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate">
                  {language === 'ku' ? 'پشتگیری بەردەوام' : language === 'ar' ? 'دعم مستمر' : '24/7 Support'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                  {language === 'ku' ? 'خزمەتگوزاری بەکارهێنەران' : language === 'ar' ? 'خدمة العملاء' : 'Customer care'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. Main Footer Content Column Grid (Centered on mobile) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 text-center ${isRTL ? 'md:text-right' : 'md:text-left'}`}>
          
          {/* Brand & Store Info (4 Cols) */}
          <div className="lg:col-span-4 space-y-5 flex flex-col items-center md:items-start">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="bg-gradient-to-tr from-rose-500 via-amber-400 to-sky-400 text-white p-2.5 rounded-2xl group-hover:scale-105 transition-all shadow-md shadow-rose-200">
                <Layers className="w-6 h-6" />
              </div>
              <span className="font-black text-2xl text-slate-900 tracking-wide">
                Galo Kids <span className="text-xl">🎈</span>
              </span>
            </Link>
            
            <p className="text-xs text-slate-600 leading-relaxed font-medium max-w-sm md:max-w-none">
              {language === 'ku' 
                ? 'گەڵۆ کیدس، باشترین و جوانترین پۆشاک و یاری منداڵان بە کواڵیتی بەرز و دڵنیا. بە خۆشەویستییەوە هەمیشە لە خزمەتی منداڵە نازدارەکانتانداین.'
                : language === 'ar'
                ? 'غالو كيدز، أحدث وأجمل ملابس وألعاب الأطفال بجودة عالية. نسعى دائماً لتقديم الأفضل لأطفالكم الأحبة.'
                : 'Galo Kids offers premium clothing and toys for little explorers. Curated with love, designed for everyday play and memorable moments.'
              }
            </p>

            {/* Direct Contact List - All centered on mobile */}
            <div className="space-y-3 pt-1 w-full flex flex-col items-center md:items-start">
              <div className={`flex items-center justify-center md:justify-start gap-3 text-slate-700 text-xs font-semibold ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{addressValue}</span>
              </div>
              
              <a 
                href={`tel:${cleanPhone}`} 
                className={`flex items-center justify-center md:justify-start gap-3 text-slate-700 text-xs font-semibold hover:text-rose-600 transition-colors ${isRTL ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <span dir="ltr" className="font-extrabold">{phoneValue}</span>
              </a>

              <a 
                href={`mailto:${emailValue}`} 
                className={`flex items-center justify-center md:justify-start gap-3 text-slate-700 text-xs font-semibold hover:text-rose-600 transition-colors ${isRTL ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span>{emailValue}</span>
              </a>
            </div>

            {/* Direct WhatsApp Quick Chat */}
            <div className="pt-1 flex justify-center md:justify-start w-full">
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {language === 'ku' ? 'گفتوگۆی ڕاستەوخۆ لە وەتسئەپ' : language === 'ar' ? 'محادثة مباشرة عبر واتساب' : 'Chat on WhatsApp'}
                </span>
              </a>
            </div>
          </div>

          {/* Quick Links Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className={`text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-center gap-2 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{language === 'ku' ? 'بەستەرە خێراکان' : language === 'ar' ? 'روابط سريعة' : 'Quick Links'}</span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/products" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <Package className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{language === 'ku' ? 'هەموو بەرهەمەکان' : language === 'ar' ? 'جميع المنتجات' : 'All Products'}</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{language === 'ku' ? 'دەربارەی ئێمە' : language === 'ar' ? 'عن المتجر' : 'About Us'}</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ku' ? 'پەیوەندیمان پێوە بکە' : language === 'ar' ? 'اتصل بنا' : 'Contact Us'}</span>
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{language === 'ku' ? 'دڵخوازەکانم' : language === 'ar' ? 'المفضلة' : 'Wishlist'}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className={`text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-center gap-2 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{language === 'ku' ? 'پشتیوانی و یارمەتی' : language === 'ar' ? 'الدعم والمساعدة' : 'Support'}</span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/faq" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{language === 'ku' ? 'پڕسیارە باوەکان' : language === 'ar' ? 'الأسئلة الشائعة' : 'FAQs'}</span>
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <Truck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>{language === 'ku' ? 'گەیاندن و گەڕاندنەوە' : language === 'ar' ? 'الشحن والاسترجاع' : 'Shipping & Returns'}</span>
                </Link>
              </li>
              <li>
                <Link to="/track" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <Compass className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{language === 'ku' ? 'بەدواداچوونی داواکاری' : language === 'ar' ? 'تتبع الطلب' : 'Track Order'}</span>
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className={`text-xs text-slate-600 hover:text-rose-600 font-bold transition-colors flex items-center justify-center gap-2.5 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                  <Ruler className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'ku' ? 'ڕێنمایی سایز' : language === 'ar' ? 'دليل المقاسات' : 'Size Guide'}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter & Social Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className={`flex items-center justify-center gap-2 ${isRTL ? 'md:flex-row-reverse md:justify-start' : 'md:justify-start'}`}>
                <Send className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {language === 'ku' ? 'بەشداربە لە هەواڵنامە' : language === 'ar' ? 'اشترك في النشرة البريدية' : 'Newsletter'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {language === 'ku' 
                  ? 'بۆ وەرگرتنی نوێترین داشکاندن و بەرهەمە نوێیەکان ئیمەیڵەکەت تۆمار بکە.'
                  : language === 'ar'
                  ? 'احصل على أحدث العروض والخصومات الحصرية مباشرة في بريدك.'
                  : 'Subscribe to get unique discount offers, special kid events & news.'
                }
              </p>
              
              {isSubscribed ? (
                <div className={`flex items-center justify-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-extrabold animate-fade-in ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {language === 'ku' ? 'سوپاس! ئیمەیڵەکەت بە سەرکەوتوویی تۆمارکرا. 🎉' : language === 'ar' ? 'شكراً! تم الاشتراك بنجاح 🎉' : 'Subscribed successfully! 🎉'}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <div className="relative flex items-center">
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'ku' ? 'ئیمەیڵەکەت بنووسە...' : language === 'ar' ? 'أدخل بريدك الإلكتروني...' : 'Enter your email...'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-slate-800 placeholder-slate-400 text-center md:text-right"
                    />
                    <button 
                      type="submit"
                      aria-label="Submit subscription"
                      className={`absolute ${isRTL ? 'left-1.5' : 'right-1.5'} p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs`}
                    >
                      <ArrowRight className={`w-4 h-4 transform ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Social Media Channels */}
            <div className="space-y-2 text-center md:text-right">
              <span className="block text-xs font-black text-slate-700">
                {language === 'ku' ? 'تۆڕە کۆمەڵایەتییەکانمان:' : language === 'ar' ? 'تابعنا على:' : 'Follow Us:'}
              </span>
              <div className={`flex items-center justify-center gap-2 flex-wrap ${isRTL ? 'md:justify-start' : 'md:justify-start'}`}>
                {socialLinks.map((social, idx) => (
                  <a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`p-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl transition-all duration-300 ${social.hoverColor} hover:scale-105 active:scale-95 shadow-xs`}
                  >
                    <social.icon className="w-4.5 h-4.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Payment & Delivery Badges Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs text-center">
          <div className={`flex items-center justify-center gap-2 text-xs font-bold text-slate-700 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <CreditCard className="w-4 h-4 text-rose-500" />
            <span>
              {language === 'ku' ? 'شێوازەکانی پارەدان:' : language === 'ar' ? 'طرق الدفع المتاحة:' : 'Accepted Payments:'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-lg">
              💵 {language === 'ku' ? 'پارەدان لەکاتی وەرگرتن' : language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
            </span>
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-lg">
              💳 FastPay / FIB / Qi Card
            </span>
            <span className="text-[11px] font-black text-sky-800 bg-sky-50 border border-sky-200/80 px-3 py-1 rounded-lg">
              📱 Zain Cash
            </span>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Terms */}
        <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-semibold text-slate-500 text-center">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} <span className="text-slate-900 font-extrabold">Galo Kids</span>. {language === 'ku' ? 'هەموو مافەکانی پارێزراوە.' : language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/faq" className="hover:text-rose-600 transition-colors">
              {language === 'ku' ? 'مەرجەکان' : language === 'ar' ? 'الشروط' : 'Terms'}
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/shipping-returns" className="hover:text-rose-600 transition-colors">
              {language === 'ku' ? 'تایبەتمەندی' : language === 'ar' ? 'الخصوصية' : 'Privacy'}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
