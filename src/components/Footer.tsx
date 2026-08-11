import React, { useState } from 'react';
import { Facebook, Instagram, MessageCircle, Video, Ghost } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';
import { StoreLogo } from './StoreLogo';
import { KidsIcon, KidsIconName } from './KidsIcons';

/**
 * The newsletter strip and the site footer.
 *
 * Four columns on a wide screen, two at tablet, one on a phone. The contact
 * details and the shop name come from the store settings, so changing them in
 * the admin panel changes them here.
 */
export const Footer: React.FC = () => {
  const { language } = useLanguage();
  const { storeSettings, categories } = useStore();
  const [contact, setContact] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setSubscribed(true);
    setContact('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  const storeName = storeSettings?.store_name || L('گەلۆ کیدز', 'غالو كيدز', 'Galo Kids');
  const phone = storeSettings?.store_phone;
  const email = storeSettings?.contact_email;

  const whatsapp = storeSettings?.whatsapp_number
    ? `https://wa.me/${String(storeSettings.whatsapp_number).replace(/\D/g, '')}`
    : null;

  const socials = [
    { Icon: Facebook, href: storeSettings?.facebook_url, label: L('فەیسبووک', 'فيسبوك', 'Facebook') },
    { Icon: Instagram, href: storeSettings?.instagram_url, label: L('ئینستاگرام', 'إنستغرام', 'Instagram') },
    { Icon: Video, href: storeSettings?.tiktok_url, label: 'TikTok' },
    { Icon: Ghost, href: storeSettings?.snapchat_url, label: 'Snapchat' },
    { Icon: MessageCircle, href: whatsapp, label: L('واتساپ', 'واتساب', 'WhatsApp') },
  ].filter((s): s is { Icon: typeof Facebook; href: string; label: string } => !!s.href);

  const categoryName = (c: any) =>
    (language === 'ku' && c.nameKu) || (language === 'ar' && c.nameAr) || c.name;

  const linkCls = 'text-[13.5px] text-[#C3C6E0] hover:text-candy-500 transition-colors';
  const headCls = 'text-[15.5px] font-black text-white mb-4';

  const quickLinks = [
    { to: '/', label: L('سەرەکی', 'الرئيسية', 'Home') },
    { to: '/products', label: L('هەموو بەرهەمەکان', 'كل المنتجات', 'All products') },
    { to: '/about', label: L('دەربارەی ئێمە', 'من نحن', 'About us') },
    { to: '/contact', label: L('پەیوەندی', 'اتصل بنا', 'Contact') },
    { to: '/track', label: L('بەدواداچوونی داواکاری', 'تتبع الطلب', 'Track order') },
  ];

  const helpLinks = [
    { to: '/size-guide', label: L('ڕێنمایی قەبارە', 'دليل المقاسات', 'Size guide') },
    { to: '/shipping-returns', label: L('گەیاندن و کرێی گەیاندن', 'الشحن والتوصيل', 'Shipping & delivery') },
    { to: '/shipping-returns', label: L('گەڕاندنەوە و ئاڵوگۆڕ', 'الإرجاع والاستبدال', 'Returns & exchange') },
    { to: '/faq', label: L('پرسیارە دووبارەکان', 'الأسئلة الشائعة', 'FAQ') },
  ];

  // Prefer the shop's own categories; fall back to the standing ones so the
  // column is never empty on a fresh install.
  const categoryLinks = (categories || []).length > 0
    ? (categories || []).slice(0, 5).map((c: any) => ({ to: `/products?category=${c.id}`, label: categoryName(c) }))
    : [
        { to: '/products?gender=2', label: L('جلی کچان', 'ملابس البنات', 'Girls') },
        { to: '/products?gender=1', label: L('جلی کوڕان', 'ملابس الأولاد', 'Boys') },
        { to: '/products', label: L('نۆزاد', 'حديثي الولادة', 'Newborn') },
      ];

  return (
    <>
      {/* Newsletter strip */}
      <div className="relative z-10 bg-ink-900 text-white font-arabic">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5 py-8">
            <div className="flex items-center gap-4">
              <span className="w-[54px] h-[54px] rounded-[18px] bg-candy-500 grid place-items-center shrink-0">
                <KidsIcon name="mail" className="w-7 h-7" tint="sun" />
              </span>
              <div>
                <strong className="block text-lg font-black">
                  {L(`ببە بە بەشێک لە خێزانی ${storeName}!`, `انضم إلى عائلة ${storeName}!`, `Join the ${storeName} family!`)}
                </strong>
                <small className="text-[13px] text-[#B9BCD8]">
                  {L('داشکاندنی تایبەت، بەرهەمی نوێ و ئامۆژگاری قەبارە', 'عروض حصرية، منتجات جديدة ونصائح المقاسات', 'Exclusive offers, new arrivals and sizing tips')}
                </small>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="flex gap-2.5 flex-1 min-w-[280px] max-w-[460px]">
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={L('ژمارەی مۆبایل یان ئیمەیڵ', 'رقم الهاتف أو البريد', 'Phone number or email')}
                aria-label={L('بەشداریکردن', 'اشتراك', 'Subscribe')}
                className="flex-1 min-w-0 bg-white border-0 rounded-full px-5 py-3 text-sm text-slate-800 font-bold outline-none focus:ring-2 focus:ring-candy-400"
              />
              <button
                type="submit"
                className="bg-candy-500 hover:bg-candy-600 text-white text-sm font-black px-6 rounded-full transition-colors cursor-pointer shrink-0"
              >
                {subscribed ? L('سوپاس!', 'شكراً!', 'Thanks!') : L('بەشداری', 'اشتراك', 'Subscribe')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer proper */}
      <footer className="relative z-10 bg-[#23253A] text-[#C3C6E0] pt-13 font-arabic">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:gap-10">

            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <StoreLogo className="w-[42px] h-[42px]" />
                <b className="text-[19px] font-black text-white">{storeName}</b>
              </Link>

              <p className="text-[13.5px] mb-4 leading-relaxed">
                {L(
                  'فرۆشگای جل و پێداویستی منداڵان. لە هەولێرەوە بۆ هەموو عێراق — بە پارچەی سروشتی، نرخی ڕێک و گەیاندنی متمانەپێکراو.',
                  'متجر ملابس ومستلزمات الأطفال. من أربيل إلى كل العراق — أقمشة طبيعية، أسعار عادلة وتوصيل موثوق.',
                  'Kids clothing and essentials. From Erbil to all of Iraq — natural fabrics, fair prices and delivery you can count on.'
                )}
              </p>

              {(phone || email) && (
                <ul className="text-[13.5px] space-y-1.5 mb-4 list-none p-0">
                  {phone && (
                    <li className="flex items-center gap-2">
                      <KidsIcon name="phone" className="w-4 h-4 shrink-0" />
                      <span dir="ltr">{phone}</span>
                    </li>
                  )}
                  {email && (
                    <li className="flex items-center gap-2">
                      <KidsIcon name="mail" className="w-4 h-4 shrink-0" />
                      <span dir="ltr" className="truncate">{email}</span>
                    </li>
                  )}
                </ul>
              )}

              {/* Only the channels the shop has actually configured — a dead
                  link is worse than a missing one. */}
              <div className="flex flex-wrap gap-2.5">
                {socials.map(({ Icon, href, label }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    title={label}
                    className="w-10 h-10 rounded-[13px] bg-white/8 hover:bg-candy-500 grid place-items-center text-white transition-colors"
                  >
                    <Icon className="w-[17px] h-[17px]" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className={headCls}>{L('بەستەرە خێراکان', 'روابط سريعة', 'Quick links')}</h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {quickLinks.map((l, i) => (
                  <li key={i}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className={headCls}>{L('بەشەکان', 'الأقسام', 'Categories')}</h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {categoryLinks.map((l, i) => (
                  <li key={i}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Help + payment */}
            <div>
              <h4 className={headCls}>{L('یارمەتی', 'المساعدة', 'Help')}</h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0 mb-5">
                {helpLinks.map((l, i) => (
                  <li key={i}><Link to={l.to} className={linkCls}>{l.label}</Link></li>
                ))}
              </ul>

              <h4 className="text-[13.5px] font-black text-white mb-4">
                {L('شێوازی پارەدان', 'طرق الدفع', 'Payment methods')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {([
                  { icon: 'cash', label: L('لە کاتی وەرگرتن', 'عند الاستلام', 'Cash on delivery') },
                  { icon: 'card', label: L('فاست پەی', 'فاست باي', 'FastPay') },
                ] as { icon: KidsIconName; label: string }[]).map((p, i) => (
                  <span key={i} className="bg-white/8 rounded-[10px] px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5">
                    <KidsIcon name={p.icon} className="w-[17px] h-[17px]" />
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* The phone tab bar floats over the very bottom of the page, and
              this is the last row on it — so the clearance belongs here. */}
          <div className="mt-10 border-t border-white/10 pt-5 pb-[calc(1.25rem+68px)] lg:pb-5 flex flex-wrap justify-between gap-3 text-[12.5px]">
            <span>
              {L(
                `© ٢٠٢٦ ${storeName} — هەموو مافەکان پارێزراون.`,
                `© ٢٠٢٦ ${storeName} — جميع الحقوق محفوظة.`,
                `© 2026 ${storeName} — All rights reserved.`
              )}
            </span>
            <span className="flex gap-2">
              <Link to="/faq" className={linkCls}>{L('مەرجەکانی بەکارهێنان', 'شروط الاستخدام', 'Terms')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/faq" className={linkCls}>{L('سیاسەتی تایبەتمەندێتی', 'سياسة الخصوصية', 'Privacy')}</Link>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
};
