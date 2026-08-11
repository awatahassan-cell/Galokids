import React, { useState } from 'react';
import { 
  Mail, Send, ChevronRight, Shield, Leaf, Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';

export const Footer: React.FC = () => {
  const { language } = useLanguage();
  const { storeSettings } = useStore();
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

  const phoneValue = storeSettings.store_phone || '+01 (88) 282 7777';
  const emailValue = storeSettings.contact_email || 'hello@vastraakids.com';
  const addressValue = storeSettings.store_address || (
    language === 'ku' ? 'سلێمانی - كوردستان - عێراق' : language === 'ar' ? 'السليمانية - كوردستان - العراق' : 'Beverley Rd Brooklyn, New York 11226, USA.'
  );

  return (
    <footer className="vk2-footer2 bg-[#161622] text-slate-300 mt-20 relative font-arabic border-t border-slate-800/80 shadow-2xl">
      
      {/* Newsletter Strip */}
      <div className="vk2-footer2-newsletter bg-gradient-to-r from-candy-500 via-candy-600 to-grape-600 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 text-white shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-4 text-center md:text-left rtl:md:text-right">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 hidden sm:flex">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black mb-1">
                {language === 'ku' ? 'تێکەڵ بە خێزانی گەلۆ کیدس بە!' : language === 'ar' ? 'انضم إلى عائلة غالو كيدز!' : 'Join the Vastraa Kids Family!'}
              </h3>
              <p className="text-xs sm:text-sm text-pink-100 font-bold">
                {language === 'ku' ? 'داشکاندنی تایبەت و نوێترین پۆشاکەکان ڕاستەوخۆ وەربگرە.' : language === 'ar' ? 'احصل على العروض الحصرية والأخبار مباشرة في بريدك.' : 'Get exclusive deals, new arrivals & style tips straight to your inbox.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-auto">
            <div className="bg-white rounded-full p-1.5 flex items-center shadow-lg w-full md:w-[420px]">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'ku' ? 'ئیمەیڵەکەت بنووسە' : language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'} 
                className="bg-transparent text-slate-800 text-xs font-bold px-4 py-2 flex-grow focus:outline-none placeholder:text-slate-400"
              />
              <button 
                type="submit"
                className="bg-[#1E1E2C] hover:bg-[#FF6584] text-white text-xs font-black px-6 py-2.5 rounded-full transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubscribed ? 'Subscribed!' : 'Subscribe'}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
      <div className="vk2-footer2-body max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Column 1: Brand Info & Socials */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="vk2-footer2-logo text-2xl font-black text-white block">
              Galo<span className="text-[#FF6584]">Kids</span>
            </Link>
            <p className="vk2-footer2-about text-xs text-slate-400 font-bold leading-relaxed">
              {language === 'ku' 
                ? 'پۆشاک و پێداویستیی نایابی منداڵان بۆ ڕازاوەیی، ئاسودەیی و ساتەکانی خۆشی. سەرجەم دوورینەکان بە خۆشەویستی دروستکراون.' 
                : language === 'ar'
                ? 'أزياء أطفال فاخرة مصممة للأناقة والراحة واللحظات السعيدة. كل غرزة صُنعت بحب لأطفالكم.'
                : 'Premium kids fashion crafted for style, comfort, and happy moments. Every stitch made with love for your little ones.'}
            </p>
            <ul className="vk2-footer2-contact space-y-2 text-xs font-bold text-slate-400 pt-2 list-none p-0">
              <li className="flex items-center gap-2">📍 {addressValue}</li>
              <li className="flex items-center gap-2">📞 {phoneValue}</li>
              <li className="flex items-center gap-2">✉️ {emailValue}</li>
            </ul>
            
            {/* Social Links */}
            <div className="vk2-footer2-socials flex items-center gap-2 pt-2">
              {['f', 'ig', 'tw', 'p', 'yt'].map((s, idx) => (
                <span key={idx} className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-[#FF6584] text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors shadow-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="vk2-footer2-title text-sm font-black text-white uppercase tracking-wider">
              {language === 'ku' ? 'بەستەرە خێراکان' : language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="vk2-footer2-links space-y-2 text-xs font-bold text-slate-400 list-none p-0">
              <li><Link to="/products" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'هەموو بەرهەمەکان' : 'Shop All'}</Link></li>
              <li><Link to="/products?sort=newest" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'نوێترین بەرهەمەکان' : 'New Arrivals'}</Link></li>
              <li><Link to="/products?featured=true" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'پڕفرۆشترینەکان' : 'Best Sellers'}</Link></li>
              <li><Link to="/products?sale=true" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'داشکاندنەکان' : 'Sale Items'}</Link></li>
              <li><Link to="/about" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'دەربارەی ئێمە' : 'About Us'}</Link></li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div className="space-y-3">
            <h4 className="vk2-footer2-title text-sm font-black text-white uppercase tracking-wider">
              {language === 'ku' ? 'پۆڵەکان' : language === 'ar' ? 'الأقسام' : 'Categories'}
            </h4>
            <ul className="vk2-footer2-links space-y-2 text-xs font-bold text-slate-400 list-none p-0">
              <li><Link to="/products?gender=1" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'پۆشاکی کوڕان' : 'Boys Fashion'}</Link></li>
              <li><Link to="/products?gender=2" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'پۆشاکی کچان' : 'Girls Outfits'}</Link></li>
              <li><Link to="/products?category=infants" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'پۆشاکی ساوا' : 'Baby Clothing'}</Link></li>
              <li><Link to="/products?category=toys" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'یاری و کات بەسەربردن' : 'Toys & Fun'}</Link></li>
              <li><Link to="/products" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'پێداویستی و جوانکاری' : 'Accessories'}</Link></li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div className="space-y-3">
            <h4 className="vk2-footer2-title text-sm font-black text-white uppercase tracking-wider">
              {language === 'ku' ? 'پشتیوانی' : language === 'ar' ? 'الدعم' : 'Support'}
            </h4>
            <ul className="vk2-footer2-links space-y-2 text-xs font-bold text-slate-400 list-none p-0">
              <li><Link to="/faq" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'ناوەندی یارمەتی' : 'Help Center'}</Link></li>
              <li><Link to="/track-order" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'بەدواداچوونی داواکاری' : 'Track Order'}</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'سیاسەتی گەڕاندنەوە' : 'Returns'}</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'زانیاری گەیاندن' : 'Shipping Info'}</Link></li>
              <li><Link to="/contact" className="hover:text-[#FF6584] transition-colors flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5 text-[#FF6584] rtl:rotate-180" /> {language === 'ku' ? 'پەیوەندی' : 'Contact Us'}</Link></li>
            </ul>
          </div>

          {/* Column 5: Download App + Trust Badges */}
          <div className="space-y-4">
            <h4 className="vk2-footer2-title text-sm font-black text-white uppercase tracking-wider">
              {language === 'ku' ? 'دابەزاندنی ئەپ' : language === 'ar' ? 'تحميل التطبيق' : 'Download App'}
            </h4>
            
            <div className="space-y-2">
              <a href="#" className="vk2-footer2-app-btn bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-2.5 flex items-center gap-3 transition-colors border border-slate-700">
                <span className="text-xl"></span>
                <div className="leading-tight">
                  <span className="text-[10px] text-slate-400 block font-normal">Download on the</span>
                  <span className="text-xs font-black block">App Store</span>
                </div>
              </a>

              <a href="#" className="vk2-footer2-app-btn bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-2.5 flex items-center gap-3 transition-colors border border-slate-700">
                <span className="text-xl">▶</span>
                <div className="leading-tight">
                  <span className="text-[10px] text-slate-400 block font-normal">Get it on</span>
                  <span className="text-xs font-black block">Google Play</span>
                </div>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="vk2-footer2-trust space-y-2 pt-2">
              <span className="vk2-footer2-trust-badge flex items-center gap-2 text-xs font-bold text-slate-400">
                <Shield className="w-4 h-4 text-[#FF6584]" /> {language === 'ku' ? 'پارەدانی پارێزراو' : 'Secure Payment'}
              </span>
              <span className="vk2-footer2-trust-badge flex items-center gap-2 text-xs font-bold text-slate-400">
                <Leaf className="w-4 h-4 text-emerald-400" /> {language === 'ku' ? 'بڕوانامەدار' : 'Eco Certified'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="vk2-footer2-bottom bg-[#0D0E17] border-t border-slate-800/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <p className="vk2-footer2-copy">
            {language === 'ku'
              ? <>© ٢٠٢٦ Galo Kids. هەموو مافەکانی پارێزراوە. دروستکراوە بە <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500 mx-1" /> بۆ منداڵانی ئازیز.</>
              : <>© 2026 Galo Kids. All Rights Reserved. Made with <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500 mx-1" /> for little ones.</>
            }
          </p>
          
          {/* Iraqi Payment Badges & Logos */}
          <div className="vk2-footer2-payments flex flex-wrap items-center gap-2 text-slate-200 text-xs font-black">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-md text-[11px]">
              💳 Qi Card
            </span>
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-md text-[11px]">
              📱 ZainCash
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md text-[11px]">
              ⚡ FastPay
            </span>
            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2.5 py-1 rounded-md text-[11px]">
              🏦 FIB
            </span>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-md text-[11px]">
              🚚 {language === 'ku' ? 'پارەدان لەکاتی وەرگرتن' : language === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
};
