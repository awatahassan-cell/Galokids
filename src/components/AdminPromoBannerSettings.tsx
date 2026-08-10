import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useToast } from './ui/Feedback';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';
import { PromoSlide } from '../types';
import { 
  Plus, Trash2, Edit3, ArrowUp, ArrowDown, Save, Image as ImageIcon, 
  Layers, Sparkles, Link as LinkIcon, Eye, EyeOff
} from 'lucide-react';

const DEFAULT_PROMO_SLIDES: PromoSlide[] = [
  {
    id: '1',
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
    imageUrl: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=1600&q=80',
    link: '/products',
  },
  {
    id: '2',
    badgeKu: 'دیاری تایبەت',
    badgeAr: 'هدية خاصة',
    badgeEn: 'Special Gift',
    titleKu: 'دیاری و یاریی ناوازە',
    titleAr: 'ألعاب وهدايا مميزة',
    titleEn: 'Unique Toys & Gifts',
    subtitleKu: 'شێوازی نوێ و تایبەت بۆ منداڵە نازدارەکانتان',
    subtitleAr: 'تشكيلة رائعة ومميزة لأطفالكم الصغار',
    subtitleEn: 'Exclusive collection for your little ones',
    ctaKu: 'ئێستا بکڕە',
    ctaAr: 'تسوق الآن',
    ctaEn: 'Shop Now',
    imageUrl: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=1600',
    link: '/products',
  },
];

export const AdminPromoBannerSettings: React.FC = () => {
  const { promoBanner, updatePromoBanner } = useStore();
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);
  const toast = useToast();

  const [isActive, setIsActive] = useState<boolean>(true);
  const [endDate, setEndDate] = useState<string>('');
  const [slides, setSlides] = useState<PromoSlide[]>(DEFAULT_PROMO_SLIDES);
  const [editingSlide, setEditingSlide] = useState<PromoSlide | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (promoBanner) {
      setIsActive(promoBanner.isActive ?? true);
      setEndDate(promoBanner.endDate || '');
      if (promoBanner.slides && Array.isArray(promoBanner.slides) && promoBanner.slides.length > 0) {
        setSlides(promoBanner.slides);
      } else if (promoBanner.titleKu || promoBanner.imageUrl) {
        // Build single slide from old promoBanner format
        setSlides([{
          id: '1',
          badgeKu: 'داشکاندنی هاوینە',
          badgeAr: 'تخفيضات الصيف',
          badgeEn: 'Summer Sale',
          titleKu: promoBanner.titleKu || 'کۆکراوەی داشکاندنی هاوینە',
          titleAr: promoBanner.titleAr || 'تشكيلة تخفيضات الصيف',
          titleEn: promoBanner.titleEn || 'Summer Sale Collection',
          subtitleKu: promoBanner.subtitleKu || 'تا ٪٥٠ داشکاندن بۆ هەندێک کاڵا',
          subtitleAr: promoBanner.subtitleAr || 'خصم يصل إلى 50٪',
          subtitleEn: promoBanner.subtitleEn || 'Up to 50% discount',
          ctaKu: 'سەیری بەرهەمەکان بکە',
          ctaAr: 'تسوق الآن',
          ctaEn: 'Shop Now',
          imageUrl: promoBanner.imageUrl || DEFAULT_PROMO_SLIDES[0].imageUrl,
          link: '/products',
        }]);
      }
    }
  }, [promoBanner]);

  const handleSaveAll = () => {
    const firstSlide = slides[0] || DEFAULT_PROMO_SLIDES[0];
    const newBanner = {
      isActive,
      endDate: endDate || undefined,
      slides,
      // Backward compatibility fields
      imageUrl: firstSlide.imageUrl,
      titleKu: firstSlide.titleKu,
      titleAr: firstSlide.titleAr || firstSlide.titleKu,
      titleEn: firstSlide.titleEn || firstSlide.titleKu,
      subtitleKu: firstSlide.subtitleKu || '',
      subtitleAr: firstSlide.subtitleAr || '',
      subtitleEn: firstSlide.subtitleEn || '',
    };

    updatePromoBanner(newBanner);
    toast(L('Promo Banner Carousel saved successfully ✅'), 'success');
  };

  const handleCreateNewSlide = () => {
    const newSlide: PromoSlide = {
      id: Date.now().toString(),
      badgeKu: 'پڕۆمۆ',
      badgeAr: 'عروض',
      badgeEn: 'Promo',
      titleKu: 'سەردێڕی داشکاندنی نوێ',
      titleAr: 'عنوان العرض الجديد',
      titleEn: 'New Promo Title',
      subtitleKu: 'کورتە ڕوونکردنەوە و ڕێژەی داشکاندن',
      subtitleAr: 'وصف قصير للبانر',
      subtitleEn: 'Short description for promo',
      ctaKu: 'سەیری بەرهەمەکان بکە',
      ctaAr: 'تسوق الآن',
      ctaEn: 'Shop Now',
      imageUrl: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=1600&q=80',
      link: '/products',
    };
    setEditingSlide(newSlide);
    setIsAdding(true);
  };

  const handleSaveSlideForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide) return;

    if (isAdding) {
      setSlides(prev => [...prev, editingSlide]);
    } else {
      setSlides(prev => prev.map(s => s.id === editingSlide.id ? editingSlide : s));
    }

    setEditingSlide(null);
    setIsAdding(false);
    toast(L('Slide saved! Remember to click "Save Banner"'), 'info');
  };

  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      toast(L('At least one slide is required!'), 'error');
      return;
    }
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;
    setSlides(newSlides);
  };

  return (
    <div className="space-y-8">
      {/* HEADER & GLOBAL SAVE */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-200" />
            دەستکاری کارۆسێلی پڕۆمۆ (Promo Banner Carousel)
          </h2>
          <p className="text-pink-100 text-sm mt-1 font-medium">
            بەڕێوەبردنی بەشی بانەری پڕۆمۆ و داشکاندنەکان لەشێوەی کارۆسێلدا
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          className="bg-white text-slate-900 hover:bg-pink-50 font-black px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 text-sm cursor-pointer self-end sm:self-center"
        >
          <Save className="w-4 h-4 text-fuchsia-600" />
          پاشەکەوتکردنی بانەر
        </button>
      </div>

      {/* BANNER CONTROLS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            {isActive ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">
                <EyeOff className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-slate-900 block text-base">بانەری پڕۆمۆ چالاکە (Banner is Active)</span>
              <span className="text-xs text-slate-500">پێشاندانی بەشی بانەری پڕۆمۆ لە پەڕەی سەرەکیدا</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isActive} 
              onChange={(e) => setIsActive(e.target.checked)} 
            />
            <div className="w-12 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-fuchsia-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            کاتی کۆتاییهاتنی داشکاندن (ئارەزوومەندانە)
          </label>
          <input 
            type="datetime-local" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="w-full border border-slate-300 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none" 
          />
        </div>
      </div>

      {/* SLIDES LIST */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-fuchsia-500" />
              سڵایدەکانی بانەری پڕۆمۆ ({slides.length})
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              زیادکردن و دەستکاریکردنی وێنە و دەقەکانی پڕۆمۆ
            </p>
          </div>
          <button
            onClick={handleCreateNewSlide}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            زیادکردنی سڵایدی نوێ
          </button>
        </div>

        {/* SLIDES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* IMAGE PREVIEW */}
              <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-900">
                <img
                  src={slide.imageUrl}
                  alt={slide.titleKu}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                  <span className="bg-fuchsia-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md w-max mb-1">
                    {slide.badgeKu || slide.badgeEn}
                  </span>
                  <h4 className="text-base font-bold truncate">{slide.titleKu || slide.titleEn}</h4>
                  <p className="text-xs text-slate-300 truncate">{slide.subtitleKu || slide.subtitleEn}</p>
                </div>
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-white text-xs font-mono font-bold">
                  #{index + 1}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-fuchsia-600 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === slides.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-fuchsia-600 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingSlide(slide);
                      setIsAdding(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    دەستکاری
                  </button>
                  <button
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    سڕینەوە
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT / ADD MODAL */}
      {editingSlide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-fuchsia-500" />
                {isAdding ? 'زیادکردنی سڵایدی پڕۆمۆی نوێ' : 'دەستکاریکردنی سڵایدی پڕۆمۆ'}
              </h3>
              <button
                onClick={() => setEditingSlide(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlideForm} className="space-y-4">
              {/* IMAGE URL */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  لینکی وێنە (Image URL) *
                </label>
                <input
                  type="url"
                  required
                  value={editingSlide.imageUrl}
                  onChange={e => setEditingSlide({ ...editingSlide, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                />
                {editingSlide.imageUrl && (
                  <div className="mt-2 h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={editingSlide.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* LINK */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <LinkIcon className="w-4 h-4 text-fuchsia-500" />
                  لینکی کلیك (Target Link)
                </label>
                <input
                  type="text"
                  value={editingSlide.link || ''}
                  onChange={e => setEditingSlide({ ...editingSlide, link: e.target.value })}
                  placeholder="/products یان /products?category=toys"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                />
              </div>

              {/* BADGES (KU / AR / EN) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نیشانە (کوردی)</label>
                  <input
                    type="text"
                    value={editingSlide.badgeKu || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, badgeKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نیشانە (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.badgeAr || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, badgeAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Badge (English)</label>
                  <input
                    type="text"
                    value={editingSlide.badgeEn || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, badgeEn: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* TITLES (KU / AR / EN) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">سەردێڕ (کوردی) *</label>
                  <input
                    type="text"
                    required
                    value={editingSlide.titleKu}
                    onChange={e => setEditingSlide({ ...editingSlide, titleKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">سەردێڕ (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.titleAr || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, titleAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Title (English)</label>
                  <input
                    type="text"
                    value={editingSlide.titleEn || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, titleEn: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* SUBTITLES (KU / AR / EN) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ژێرنووس (کوردی)</label>
                  <input
                    type="text"
                    value={editingSlide.subtitleKu || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, subtitleKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ژێرنووس (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.subtitleAr || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, subtitleAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Subtitle (English)</label>
                  <input
                    type="text"
                    value={editingSlide.subtitleEn || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, subtitleEn: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* CTA TEXT (KU / AR / EN) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نووسینی دوگمە (کوردی)</label>
                  <input
                    type="text"
                    value={editingSlide.ctaKu || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, ctaKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نووسینی دوگمە (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.ctaAr || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, ctaAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Button Text (English)</label>
                  <input
                    type="text"
                    value={editingSlide.ctaEn || ''}
                    onChange={e => setEditingSlide({ ...editingSlide, ctaEn: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingSlide(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-sm shadow-md cursor-pointer"
                >
                  تۆمارکردنی سڵاید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
