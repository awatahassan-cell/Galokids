import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * The desktop navigation row: pill links, some of which open a panel of
 * sub-links on hover.
 *
 * The two gender menus list the shop's real categories rather than a fixed
 * set, so a category added in the admin panel appears here on its own. Each
 * entry narrows to that gender *and* that category, which is the pairing a
 * parent actually shops by.
 */
export const HeaderNav: React.FC = () => {
  const location = useLocation();
  const { categories } = useStore();
  const { t, language } = useLanguage();
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const categoryName = (c: any) =>
    (language === 'ku' && c.nameKu) || (language === 'ar' && c.nameAr) || c.name;

  // Six is as many as the panel holds without becoming a list to scroll.
  const topCategories = (categories || []).slice(0, 6);

  const isOn = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const pill = (on: boolean) =>
    `inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-bold transition-colors ${
      on ? 'bg-candy-50 text-candy-700' : 'text-slate-900 hover:bg-candy-50 hover:text-candy-700'
    }`;

  /** A top-level link that reveals a panel of sub-links on hover or focus. */
  const Menu: React.FC<{ label: string; to: string; on: boolean; items: { label: string; to: string }[] }> =
    ({ label, to, on, items }) => (
      <div className="relative group">
        <Link to={to} className={pill(on)}>
          {label}
          <span className="text-[9px] opacity-55">▾</span>
        </Link>
        <div
          className="absolute top-[calc(100%+8px)] start-0 min-w-[210px] bg-white border border-slate-200/80 rounded-2xl p-2 shadow-2xl
                     opacity-0 invisible translate-y-2 transition-all duration-200
                     group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                     group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 z-50"
        >
          {items.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="block px-3 py-2 rounded-xl text-[13.5px] font-semibold text-slate-500 hover:bg-candy-50 hover:text-candy-700 transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    );

  const genderMenu = (gender: number, label: string, all: string) => {
    const on = location.search.includes(`gender=${gender}`);
    if (topCategories.length === 0) {
      return <Link to={`/products?gender=${gender}`} className={pill(on)}>{label}</Link>;
    }
    return (
      <Menu
        label={label}
        to={`/products?gender=${gender}`}
        on={on}
        items={[
          { label: all, to: `/products?gender=${gender}` },
          ...topCategories.map((c: any) => ({
            label: categoryName(c),
            to: `/products?gender=${gender}&category=${c.id}`,
          })),
        ]}
      />
    );
  };

  return (
    <nav className="hidden lg:flex items-center gap-1">
      <Link to="/" className={pill(isOn('/', true))}>{t('home')}</Link>

      {genderMenu(1, L('کوڕان', 'أولاد', 'Boys'), L('هەموو جلی کوڕان', 'كل ملابس الأولاد', 'All boys'))}
      {genderMenu(2, L('کچان', 'بنات', 'Girls'), L('هەموو جلی کچان', 'كل ملابس البنات', 'All girls'))}

      <Link to="/products?sort=newest" className={pill(location.search.includes('sort=newest'))}>
        {L('نوێترین', 'الأحدث', 'New in')}
        <span className="bg-mint-500 text-[#05372A] text-[9.5px] font-black rounded-full px-[7px] py-px ms-0.5">
          {L('نوێ', 'جديد', 'NEW')}
        </span>
      </Link>

      <Menu
        label={L('فرۆشگا', 'المتجر', 'Shop')}
        to="/products"
        on={isOn('/products') && !location.search}
        items={[
          { label: L('هەموو بەرهەمەکان', 'كل المنتجات', 'All products'), to: '/products' },
          { label: L('داشکاندنەکان', 'التخفيضات', 'On sale'), to: '/products?sale=true' },
          { label: L('دڵخوازەکانم', 'المفضلة', 'My wishlist'), to: '/wishlist' },
          { label: L('داواکارییەکانم', 'طلباتي', 'My orders'), to: '/my-orders' },
          { label: L('بەدواداچوونی داواکاری', 'تتبع الطلب', 'Track order'), to: '/track' },
        ]}
      />

      <Link to="/about" className={pill(isOn('/about'))}>{t('about')}</Link>
      <Link to="/contact" className={pill(isOn('/contact'))}>
        {L('پەیوەندی', 'اتصل بنا', 'Contact')}
      </Link>
    </nav>
  );
};
