import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useToast } from './ui/Feedback';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';
import { HeroSlide } from '../types';
import { 
  Plus, Trash2, Edit3, ArrowUp, ArrowDown, Save, Image as ImageIcon, 
  Layers, Check, Sparkles, Layout, Link as LinkIcon
} from 'lucide-react';

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

export const AdminHeroSettings: React.FC = () => {
  const { storeSettings, saveSettings } = useStore();
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);
  const toast = useToast();

  const [heroRadius, setHeroRadius] = useState<string>('rounded-xl');
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_SLIDES);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (storeSettings.hero_radius) {
      setHeroRadius(storeSettings.hero_radius);
    }
    if (storeSettings.hero_slides) {
      try {
        const parsed = typeof storeSettings.hero_slides === 'string'
          ? JSON.parse(storeSettings.hero_slides)
          : storeSettings.hero_slides;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed);
        }
      } catch (e) {
        console.warn('Could not parse hero_slides:', e);
      }
    }
  }, [storeSettings]);

  const radiusOptions = [
    { value: 'rounded-none', labelKu: 'سفر - چارگۆشەی تیژ', labelEn: 'None (0px)', class: 'rounded-none' },
    { value: 'rounded-lg', labelKu: 'بچووک (8px)', labelEn: 'Small (8px)', class: 'rounded-lg' },
    { value: 'rounded-xl', labelKu: 'کەم / مامناوەند (12px) ⭐ داواکراو', labelEn: 'Medium (12px) ⭐ Recommended', class: 'rounded-xl' },
    { value: 'rounded-2xl', labelKu: 'گەورە (16px)', labelEn: 'Large (16px)', class: 'rounded-2xl' },
    { value: 'rounded-3xl', labelKu: 'زۆر گەورە (24px)', labelEn: 'Extra Large (24px)', class: 'rounded-3xl' },
  ];

  const handleSaveAll = async () => {
    setSaving(true);
    const ok = await saveSettings({
      hero_radius: heroRadius,
      hero_slides: JSON.stringify(slides),
    });
    setSaving(false);
    toast(
      ok ? L('Hero Settings Saved Successfully ✅') : L('Could not save settings'),
      ok ? 'success' : 'error'
    );
  };

  const handleCreateNewSlide = () => {
    const newSlide: HeroSlide = {
      id: Date.now().toString(),
      badgeKu: 'نوێ',
      badgeAr: 'جديد',
      badgeEn: 'New',
      titleKu: 'سەردێڕی نوێ',
      titleAr: 'عنوان جديد',
      titleEn: 'New Title',
      subtitleKu: 'ژێرنووس و وەسفی کورت',
      subtitleAr: 'وصف قصير للغلاف',
      subtitleEn: 'Short description for slide',
      ctaKu: 'ئێستا بکڕە',
      ctaAr: 'تسوق الآن',
      ctaEn: 'Shop Now',
      image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=1600',
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
    toast(L('Slide saved! Remember to click "Save All Settings"'), 'info');
  };

  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      toast(L('At least one hero slide is required!'), 'error');
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
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-200" />
            دەستکاری کارۆسێلی هێرۆ (Hero Carousel Settings)
          </h2>
          <p className="text-orange-100 text-sm mt-1 font-medium">
            گۆڕینی ڕادیەس، سڵایدەکان، وێنە، نیشانە، و سەردێڕەکانی کارۆسێلی پەڕەی سەرەکی
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-white text-slate-900 hover:bg-orange-50 font-black px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 text-sm cursor-pointer self-end sm:self-center"
        >
          <Save className="w-4 h-4 text-orange-600" />
          {saving ? L('پاشەکەوت دەکرێت...') : L('پاشەکەوتکردنی گشتی')}
        </button>
      </div>

      {/* SECTION 1: BORDER RADIUS CHOICE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-900">
            ڕادیەس و کەوانەی بنکەی کارۆسێل (Corner Radius)
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          دیاری بکە گۆشەی بەشی کارۆسێل چەند چەماوە بێت
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {radiusOptions.map((opt) => {
            const isSelected = heroRadius === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setHeroRadius(opt.value)}
                className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/50 shadow-md ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3 w-full">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {opt.value}
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-orange-600" />}
                </div>

                {/* VISUAL BOX PREVIEW */}
                <div className="w-full h-12 bg-slate-800 border border-slate-600 mb-3 relative overflow-hidden flex items-center justify-center">
                  <div className={`w-full h-full bg-gradient-to-r from-orange-500 to-amber-500 ${opt.class}`} />
                </div>

                <span className="text-sm font-bold text-slate-800">
                  {language === 'ku' ? opt.labelKu : opt.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: SLIDES LIST */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              سڵایدەکانی کارۆسێل ({slides.length})
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              سڵایدەکان دەستکاری بکە یان سڵایدی نوێ زیاد بکە
            </p>
          </div>
          <button
            onClick={handleCreateNewSlide}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
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
                  src={slide.image}
                  alt={slide.titleKu}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                  <span className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md w-max mb-1">
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
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-orange-600 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === slides.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-orange-600 disabled:opacity-30 cursor-pointer"
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
                    className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
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
                <ImageIcon className="w-5 h-5 text-orange-500" />
                {isAdding ? 'زیادکردنی سڵایدی نوێ' : 'دەستکاریکردنی سڵاید'}
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
                  value={editingSlide.image}
                  onChange={e => setEditingSlide({ ...editingSlide, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                {editingSlide.image && (
                  <div className="mt-2 h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={editingSlide.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* LINK */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <LinkIcon className="w-4 h-4 text-orange-500" />
                  لینکی کلیك (Target Link)
                </label>
                <input
                  type="text"
                  value={editingSlide.link}
                  onChange={e => setEditingSlide({ ...editingSlide, link: e.target.value })}
                  placeholder="/products یان /products?category=toys"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* BADGES (KU / AR / EN) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نیشانە (کوردی)</label>
                  <input
                    type="text"
                    value={editingSlide.badgeKu}
                    onChange={e => setEditingSlide({ ...editingSlide, badgeKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نیشانە (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.badgeAr}
                    onChange={e => setEditingSlide({ ...editingSlide, badgeAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Badge (English)</label>
                  <input
                    type="text"
                    value={editingSlide.badgeEn}
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
                    value={editingSlide.titleAr}
                    onChange={e => setEditingSlide({ ...editingSlide, titleAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Title (English)</label>
                  <input
                    type="text"
                    value={editingSlide.titleEn}
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
                    value={editingSlide.subtitleKu}
                    onChange={e => setEditingSlide({ ...editingSlide, subtitleKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ژێرنووس (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.subtitleAr}
                    onChange={e => setEditingSlide({ ...editingSlide, subtitleAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Subtitle (English)</label>
                  <input
                    type="text"
                    value={editingSlide.subtitleEn}
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
                    value={editingSlide.ctaKu}
                    onChange={e => setEditingSlide({ ...editingSlide, ctaKu: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نووسینی دوگمە (عربي)</label>
                  <input
                    type="text"
                    value={editingSlide.ctaAr}
                    onChange={e => setEditingSlide({ ...editingSlide, ctaAr: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Button Text (English)</label>
                  <input
                    type="text"
                    value={editingSlide.ctaEn}
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
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md cursor-pointer"
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
