import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HeroSlide } from '../types';

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: '1',
    badgeKu: 'پڕفرۆشترین',
    badgeAr: 'الأكثر مبيعاً',
    badgeEn: 'Best Seller',
    titleKu: 'شایستەی تۆیە',
    titleAr: 'تستحق الأفضل',
    titleEn: 'Deserves The Best',
    subtitleKu: 'باشترین کوالیتی و نوێترین مۆدێل',
    subtitleAr: 'أفضل جودة وأحدث الموديلات',
    subtitleEn: 'Highest quality & newest models',
    ctaKu: 'ئێستا بکڕە',
    ctaAr: 'تسوق الآن',
    ctaEn: 'Shop Now',
    image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=1600',
    link: '/products',
  },
  {
    id: '2',
    badgeKu: 'داشکاندنی هاوینە',
    badgeAr: 'تخفيضات الصيف',
    badgeEn: 'Summer Sale',
    titleKu: 'کۆکراوەی داشکاندنی هاوینە',
    titleAr: 'مجموعة تخفيضات الصيف',
    titleEn: 'Summer Sale Collection',
    subtitleKu: 'تا ٪٥٠ داشکاندن بۆ هەندێک کاڵا',
    subtitleAr: 'خصم يصل إلى 50٪ على منتجات مختارة',
    subtitleEn: 'Up to 50% discount on selected items',
    ctaKu: 'سەیری بەرهەمەکان بکە',
    ctaAr: 'استكشف المنتجات',
    ctaEn: 'Explore Products',
    image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=1600',
    link: '/products',
  },
];

export const Hero: React.FC = () => {
  const { language } = useLanguage();
  const { storeSettings } = useStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isRTL = language === 'ar' || language === 'ku';

  // Read radius from settings (default to 'rounded-xl')
  const heroRadius = storeSettings?.hero_radius || 'rounded-xl';

  // Parse slides from settings if available
  const slides: HeroSlide[] = useMemo(() => {
    if (storeSettings?.hero_slides) {
      try {
        const parsed = typeof storeSettings.hero_slides === 'string'
          ? JSON.parse(storeSettings.hero_slides)
          : storeSettings.hero_slides;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Could not parse hero_slides from storeSettings:', e);
      }
    }
    return DEFAULT_SLIDES;
  }, [storeSettings?.hero_slides]);

  // Keep currentSlide within bounds
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const activeSlide = slides[currentSlide] || slides[0];

  const getLangField = (slide: HeroSlide, field: 'badge' | 'title' | 'subtitle' | 'cta') => {
    if (language === 'ku') {
      return slide[`${field}Ku`] || slide[`${field}En`] || '';
    } else if (language === 'ar') {
      return slide[`${field}Ar`] || slide[`${field}En`] || '';
    }
    return slide[`${field}En`] || slide[`${field}Ku`] || '';
  };

  return (
    <div className="relative mx-4 mt-4 lg:mx-8 group">
      <div className={`relative w-full h-[250px] sm:h-[300px] md:h-[350px] ${heroRadius} overflow-hidden shadow-xl bg-slate-900 transition-all duration-300`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id || currentSlide}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Background Image */}
            <img
              src={activeSlide.image}
              alt={getLangField(activeSlide, 'title')}
              className="w-full h-full object-cover object-center"
            />
            {/* Soft Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/30 to-transparent" />

            {/* Slide Content Overlay Box */}
            <div className="absolute inset-0 p-4 sm:p-6 md:p-8 flex flex-col justify-center items-end rtl:items-start text-right rtl:text-right ltr:items-end ltr:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-[#1e2330]/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 sm:p-6 max-w-xs sm:max-w-md w-full shadow-xl space-y-2 sm:space-y-3"
              >
                {/* Badge */}
                {getLangField(activeSlide, 'badge') && (
                  <div>
                    <span className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-lg shadow-sm tracking-wide">
                      {getLangField(activeSlide, 'badge')}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h1 className={`text-lg sm:text-2xl md:text-3xl font-black text-white leading-snug ${isRTL ? 'font-arabic' : 'font-display'}`}>
                  {getLangField(activeSlide, 'title')}
                </h1>

                {/* Subtitle */}
                {getLangField(activeSlide, 'subtitle') && (
                  <p className={`text-xs sm:text-sm text-slate-300 font-bold leading-relaxed line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {getLangField(activeSlide, 'subtitle')}
                  </p>
                )}

                {/* CTA Button */}
                {getLangField(activeSlide, 'cta') && (
                  <div className="pt-1">
                    <Link
                      to={activeSlide.link || '/products'}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                      <span className={isRTL ? 'font-arabic' : ''}>
                        {getLangField(activeSlide, 'cta')}
                      </span>
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer z-10"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer z-10"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Carousel Dots Indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {slides.map((s, index) => (
              <button
                key={s.id || index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all duration-300 cursor-pointer ${
                  currentSlide === index
                    ? 'w-6 h-2 bg-orange-500 rounded-full'
                    : 'w-2 h-2 bg-white/50 hover:bg-white rounded-full'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
