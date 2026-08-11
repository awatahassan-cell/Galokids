import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingDecor } from './KidsDecor';
import { HeroSlide } from '../types';

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: '1',
    badgeKu: 'نوێترین مۆدێلەکانی وەرز',
    badgeAr: 'تشكيلة الموسم الجديدة',
    badgeEn: 'New Season Arrivals',
    titleKu: 'پۆشاکی جوان بۆ منداڵە نازدارەکانتان! 🎈',
    titleAr: 'ملابس مريحة لأجل أطفالكم الأحباء! 🎈',
    titleEn: 'Playful Clothes for Happy Little Hearts! 🎈',
    subtitleKu: 'باشترین کۆکراوەی پۆشاکی لۆکەیی نەرن بۆ یاری و خۆشی ڕۆژانەی منداڵان بە بەرزترین کواڵێتی و گونجاوترین نرخ.',
    subtitleAr: 'اكتشف أفضل ملابس الأطفال القطنية الناعمة المصممة للراحة والأناقة بأعلى جودة وأفضل الأسعار.',
    subtitleEn: 'Discover soft, vibrant, and durable premium organic apparel crafted carefully for active playground explorers.',
    ctaKu: '👧 پۆشاکی کچان',
    ctaAr: '👧 تسوق للبنات',
    ctaEn: '👧 Shop Girls',
    link: '/products?gender=2',
    cta2Ku: '👦 پۆشاکی کوڕان',
    cta2Ar: '👦 تسوق للأولاد',
    cta2En: '👦 Shop Boys',
    link2: '/products?gender=1',
    image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=1200',
    floatingBadgeTitle: '100% Cotton',
    floatingBadgeDesc: 'لۆکەی ١٠٠٪ بەرز',
    discountTag: '25% OFF',
  },
  {
    id: '2',
    badgeKu: 'تایبەت بە جەژن و ئاهەنگ',
    badgeAr: 'تشكيلة الأعياد والحفلات',
    badgeEn: 'Festive & Party Collection',
    titleKu: 'درەوشانەوەی منداڵەکانتان لە شادیدا! ✨',
    titleAr: 'تألق أطفالكم في أجمل المناسبات! ✨',
    titleEn: 'Sparkle & Elegance For Celebrations! ✨',
    subtitleKu: 'شیکترین فستان و پۆشاکی فەرمی بۆ کوڕان و کچانی تەمەنە جیاوازەکان بە ستایلی ناوازە.',
    subtitleAr: 'أجمل الفساتين والبدلات الأنيقة للأولاد والبنات بأحدث الموديلات العصرية.',
    subtitleEn: 'Stunning festive dresses & tailored suits designed to make every moment magical.',
    ctaKu: '✨ هەموو مۆدێلەکان',
    ctaAr: '✨ جميع الموديلات',
    ctaEn: '✨ View Collection',
    link: '/products',
    cta2Ku: '👧 پۆشاکی کچان',
    cta2Ar: '👧 تسوق للبنات',
    cta2En: '👧 Shop Girls',
    link2: '/products?gender=2',
    image: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&q=80&w=1200',
    floatingBadgeTitle: 'Party Soft',
    floatingBadgeDesc: 'نەرم بۆ پێستی منداڵ',
    discountTag: '30% OFF',
  }
];

export const Hero: React.FC = () => {
  const { language } = useLanguage();
  const { storeSettings } = useStore();
  const isRTL = language === 'ar' || language === 'ku';

  const [currentIndex, setCurrentIndex] = useState(0);

  // Parse slides dynamically from store settings
  const slides: HeroSlide[] = React.useMemo(() => {
    if (storeSettings?.hero_slides) {
      try {
        const parsed = typeof storeSettings.hero_slides === 'string'
          ? JSON.parse(storeSettings.hero_slides)
          : storeSettings.hero_slides;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Could not parse hero_slides:', e);
      }
    }
    return DEFAULT_SLIDES;
  }, [storeSettings]);

  const radiusClass = storeSettings?.hero_radius || 'rounded-3xl';

  // Auto-slide every 6 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const slide = slides[currentIndex] || slides[0] || DEFAULT_SLIDES[0];

  const getSlideText = (field: 'badge' | 'title' | 'subtitle' | 'cta' | 'cta2') => {
    if (language === 'ku') {
      const val = slide[`${field}Ku` as keyof HeroSlide] || slide[`${field}En` as keyof HeroSlide];
      if (val) return val as string;
    }
    if (language === 'ar') {
      const val = slide[`${field}Ar` as keyof HeroSlide] || slide[`${field}En` as keyof HeroSlide];
      if (val) return val as string;
    }
    return (slide[`${field}En` as keyof HeroSlide] || slide[`${field}Ku` as keyof HeroSlide] || '') as string;
  };

  const badgeText = getSlideText('badge') || (language === 'ku' ? 'نوێترین مۆدێلەکانی وەرز' : 'New Season Arrivals');
  const titleText = getSlideText('title') || (language === 'ku' ? 'پۆشاکی جوان بۆ منداڵە نازدارەکانتان! 🎈' : 'Playful Clothes for Happy Little Hearts! 🎈');
  const subtitleText = getSlideText('subtitle') || (language === 'ku' ? 'باشترین کۆکراوەی پۆشاکی لۆکەیی نەرن بۆ یاری و خۆشی ڕۆژانەی منداڵان.' : 'Soft, vibrant, and durable premium organic apparel.');
  const cta1Text = getSlideText('cta') || (language === 'ku' ? '👧 پۆشاکی کچان' : '👧 Shop Girls');
  const cta1Link = slide.link || slide.btn1Link || '/products?gender=2';
  const cta2Text = (slide.cta2Ku || slide.btn2TextKu || (language === 'ku' ? '👦 پۆشاکی کوڕان' : '👦 Shop Boys')) as string;
  const cta2Link = slide.link2 || slide.btn2Link || '/products?gender=1';

  const imageUrl = slide.image || slide.imageUrl || 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=1200';
  const floatTitle = (language === 'ku' && slide.floatingBadgeTitleKu) || slide.floatingBadgeTitle || '100% Cotton';
  const floatDesc = (language === 'ku' && slide.floatingBadgeDescKu) || slide.floatingBadgeDesc || (language === 'ku' ? 'لۆکەی ١٠٠٪ بەرز' : language === 'ar' ? 'قطن عضوي ممتاز' : 'Organic Fabric');
  const discountText = slide.discountTag || '25% OFF';

  return (
    <section className={`relative overflow-hidden bg-gradient-to-b from-bubble-50/60 via-pink-50/40 to-white py-8 sm:py-16 px-4 sm:px-6 lg:px-8 font-arabic ${radiusClass} border border-candy-100/60 shadow-sm mx-2 sm:mx-6 lg:mx-8 my-4 group/hero`}>
      
      {/* Soft colour washes behind the hero. */}
      <div className="vk-blob w-96 h-96 bg-bubble-500 -top-24 -start-24" />
      <div className="vk-blob w-96 h-96 bg-candy-300 -bottom-24 -end-24" />

      {/* Kid-shapes drift around the outer margins. They stay clear of the
          headline column and drop out below lg, where there is no room. */}
      <FloatingDecor
        items={[
          { shape: 'star',      style: { top: '6%', insetInlineEnd: '3%' } },
          { shape: 'butterfly', style: { top: '4%', insetInlineStart: '7%' } },
          { shape: 'balloon',   style: { bottom: '6%', insetInlineStart: '3%' } },
          { shape: 'bow',       style: { bottom: '8%', insetInlineEnd: '46%' } },
          { shape: 'rocket',    style: { top: '46%', insetInlineStart: '1%' } },
        ]}
      />

      <div className="max-w-7xl mx-auto relative z-10 min-h-[620px] sm:min-h-[660px] lg:min-h-[480px] flex flex-col justify-between">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={slide.id || currentIndex}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center flex-grow"
          >
            
            {/* Left Column: Hero Content & CTAs */}
            <div className="lg:col-span-7 text-center lg:text-right rtl:lg:text-right ltr:lg:text-left min-h-[290px] sm:min-h-[320px] lg:min-h-0 flex flex-col justify-center">
              
              {/* Vastraa Hero Badge */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-candy-500/10 via-candy-400/10 to-indigo-500/10 border border-candy-200/80 px-4 py-1.5 rounded-full mb-4 sm:mb-6 shadow-xs mx-auto lg:mx-0 w-max">
                <span className="w-2 h-2 rounded-full bg-candy-500 animate-ping" />
                <span className="text-xs font-black text-candy-700 tracking-wide">
                  {badgeText}
                </span>
              </div>

              {/* Vastraa Hero Main Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.15] mb-4 sm:mb-6 tracking-tight min-h-[80px] sm:min-h-[110px] lg:min-h-[135px] flex items-center justify-center lg:justify-start">
                {titleText.includes('!') ? (
                  <div>
                    {titleText.split('!')[0]}! <br className="hidden sm:inline" />
                    <span className="bg-gradient-to-r from-candy-500 via-candy-400 to-grape-600 bg-clip-text text-transparent">
                      {titleText.split('!')[1] || ''}
                    </span>
                  </div>
                ) : (
                  <span className="bg-gradient-to-r from-candy-500 via-candy-400 to-grape-600 bg-clip-text text-transparent">
                    {titleText}
                  </span>
                )}
              </h1>

              {/* Vastraa Subtitle Description */}
              <p className="text-slate-600 text-sm sm:text-base lg:text-lg font-bold max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed min-h-[52px] sm:min-h-[60px] flex items-center justify-center lg:justify-start">
                {subtitleText}
              </p>

              {/* Vastraa Dual Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Link 
                  to={cta1Link} 
                  className="px-6 py-3.5 rounded-full text-sm font-black text-white bg-gradient-to-r from-candy-500 to-grape-500 hover:from-candy-600 hover:to-grape-600 shadow-lg shadow-candy-500/35 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <span>{cta1Text}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>

                {cta2Text && (
                  <Link 
                    to={cta2Link} 
                    className="px-6 py-3.5 rounded-full text-sm font-black text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <span>{cta2Text}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                )}
              </div>

            </div>

            {/* Right Column: Vastraa Media Frame & Floating Badges */}
            <div className="lg:col-span-5 relative">
              
              {/* Top Floating Badge: 100% Organic Cotton */}
              <div className="absolute -top-4 -left-2 sm:-top-6 sm:-left-6 z-20 bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-2xl shadow-xl border border-candy-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-candy-50 text-candy-700 flex items-center justify-center font-black text-lg shrink-0">
                  <Star className="w-5 h-5 fill-rose-500 text-candy-700 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">{floatTitle}</h4>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500">
                    {floatDesc}
                  </p>
                </div>
              </div>

              {/* Bottom Floating Badge: Circular Discount Tag */}
              <div className="absolute -bottom-4 -right-2 sm:-bottom-6 sm:-right-6 z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-sunny-500 to-rose-500 text-white shadow-2xl border-4 border-white flex flex-col items-center justify-center text-center p-2 transform rotate-6 animate-pulse">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">GET</span>
                <span className="text-base sm:text-xl font-black leading-none">{discountText.replace(/GET|OFF|\s/gi, '')}</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">OFF</span>
              </div>

              {/* Main Hero Media Frame */}
              <div className="relative w-full h-[320px] sm:h-[420px] lg:h-[460px] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-white">
                <img 
                  src={imageUrl} 
                  alt={storeSettings?.store_name || "Galo Kids Store"}
                  className="w-full h-full object-cover object-center filter brightness-[1.02] hover:scale-105 transition-transform duration-700 ease-out" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
              </div>

            </div>

          </motion.div>
        </AnimatePresence>

        {/* Carousel Navigation Arrows & Slide Dots Indicator */}
        {slides.length > 1 && (
          <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 border-t border-candy-100/50">
            {/* Slide Pagination Dots */}
            <div className="flex items-center gap-2">
              {slides.map((s, idx) => (
                <button
                  key={s.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex 
                      ? 'w-8 bg-candy-500 shadow-md' 
                      : 'w-2.5 bg-slate-200 hover:bg-candy-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Slide Next/Prev Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-candy-500 hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % slides.length)}
                className="w-9 h-9 rounded-full bg-white text-slate-700 hover:bg-candy-500 hover:text-white border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
