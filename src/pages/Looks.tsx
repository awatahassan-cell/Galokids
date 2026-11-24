import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { useToast } from '../components/ui/Feedback';
import { fetchLooks } from '../services/looksService';
import { getUnitPrice } from '../utils/pricing';
import { formatIQDLabel } from '../utils/currency';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';
import { inStock, resolveChoice, sizesOf, sortSizes } from '../utils/looks';
import type { Look, LookItem, Product } from '../types';

/**
 * "Try the Look" — outfits on a model, built from real products.
 *
 * Everything shown here is data an admin edits: the model picture, the pieces,
 * where each numbered dot sits, the title in three languages. The colours and
 * sizes offered for a piece are the product's real variations, so what goes in
 * the basket is a real, in-stock line the server will price the same way.
 */

const COPY = {
  ku: {
    title: 'ستایلەکە تاقی بکەرەوە',
    lead: 'تەواوی جلەکان لەسەر یەک مۆدێل ببینە و هەر پارچەیەک یان هەموو ستایلەکە بخەرە سەبەتەوە.',
    all: 'هەمووی', boys: 'کوڕان', girls: 'کچان',
    pieces: 'پارچەکانی ئەم ستایلە', addPiece: 'زیادکردن', added: 'زیادکرا', addAll: 'هەموو ستایلەکە بخە سەبەتەوە',
    total: 'کۆی ستایلەکە', yourSize: 'قەبارەی منداڵەکەت', sizeHint: 'یەکجار هەڵیبژێرە، بۆ هەموو پارچەکان جێبەجێ دەبێت', notInSize: 'لەم قەبارەیەدا نەماوە', anySize: 'قەبارە بۆ هەر پارچەیەک بە جیا', soldOut: 'نەماوە', color: 'ڕەنگ', size: 'قەبارە', empty: 'هێشتا هیچ ستایلێک بڵاونەکراوەتەوە.',
    next: 'دواتر', prev: 'پێشوو', addedAll: 'ستایلەکە خرایە سەبەتەوە', someMissing: 'هەندێک پارچە نەماون و نەخران', look: 'ستایل', view: 'بینینی کاڵا',
  },
  ar: {
    title: 'جرّب الإطلالة',
    lead: 'شاهد القطع كاملة على عارض واحد وأضف أي قطعة أو الإطلالة كلها إلى السلة.',
    all: 'الكل', boys: 'أولاد', girls: 'بنات',
    pieces: 'قطع هذه الإطلالة', addPiece: 'إضافة', added: 'تمت الإضافة', addAll: 'أضف الإطلالة كاملة إلى السلة',
    total: 'مجموع الإطلالة', yourSize: 'مقاس طفلك', sizeHint: 'اختره مرة واحدة ليُطبَّق على كل القطع', notInSize: 'غير متوفر بهذا المقاس', anySize: 'مقاس مختلف لكل قطعة', soldOut: 'نفد', color: 'اللون', size: 'المقاس', empty: 'لا توجد إطلالات منشورة بعد.',
    next: 'التالي', prev: 'السابق', addedAll: 'أُضيفت الإطلالة إلى السلة', someMissing: 'بعض القطع نفدت ولم تُضف', look: 'إطلالة', view: 'عرض المنتج',
  },
  en: {
    title: 'Try the Look',
    lead: 'See the whole outfit on one model, then add a single piece or the entire look to your basket.',
    all: 'All', boys: 'Boys', girls: 'Girls',
    pieces: 'Pieces in this look', addPiece: 'Add', added: 'Added', addAll: 'Add the whole look to basket',
    total: 'Look total', yourSize: "Your child's size", sizeHint: 'Pick it once and it applies to every piece', notInSize: 'Not available in this size', anySize: 'Choose a size for each piece', soldOut: 'Sold out', color: 'Colour', size: 'Size', empty: 'No looks have been published yet.',
    next: 'Next', prev: 'Previous', addedAll: 'Look added to your basket', someMissing: 'Some pieces are sold out and were skipped', look: 'Look', view: 'View product',
  },
} as const;

const localized = (en: string | undefined, ku: string | undefined, ar: string | undefined, lang: string) =>
  (lang === 'ku' && ku) || (lang === 'ar' && ar) || en || ku || ar || '';

const productName = (p: Product, lang: string) => localized(p.name, (p as any).nameKu, (p as any).nameAr, lang);

const firstImage = (p: Product) => p.imageUrl || p.images?.[0] || '';

export const Looks: React.FC = () => {
  const { addToCart } = useStore();
  const { language, dir } = useLanguage();
  const toast = useToast();
  const copy = COPY[(language as 'ku' | 'ar' | 'en')] ?? COPY.en;

  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState<0 | 1 | 2>(0);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, { color?: string; size?: string }>>({});
  // One size for the whole outfit: a parent knows their child's size once.
  const [childSize, setChildSize] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchLooks()
      .then(rows => live && setLooks(rows))
      .catch(() => live && setLooks([]))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  const visible = useMemo(
    () => looks.filter(l => gender === 0 || l.gender === 0 || l.gender === gender),
    [looks, gender]
  );

  useEffect(() => { setIndex(0); setActive(null); }, [gender]);

  const look = visible[Math.min(index, Math.max(visible.length - 1, 0))];

  const key = (item: LookItem) => `${look?.id}:${item.productId}`;
  const choiceOf = (item: LookItem) => resolveChoice(item.product, picks[key(item)], childSize);
  const setOwn = (item: LookItem, patch: { color?: string; size?: string }) =>
    setPicks(prev => ({ ...prev, [key(item)]: { ...prev[key(item)], ...patch } }));

  const lookSizes = useMemo(() => (look ? sizesOf(look.items.map(i => i.product)) : []), [look]);
  // A size chosen on one look may not exist on the next; drop it rather than
  // silently leaving every piece "not available".
  useEffect(() => {
    if (childSize && look && !lookSizes.includes(childSize)) setChildSize(null);
  }, [look, lookSizes, childSize]);

  const go = (delta: number) => {
    if (!visible.length) return;
    setIndex(i => (i + delta + visible.length) % visible.length);
    setActive(null);
  };

  // Arrow keys move through looks; "next" is the way the language reads.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const towardsNext = (e.key === 'ArrowLeft') === (dir === 'rtl');
      go(towardsNext ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const buyable = (item: LookItem) => {
    const v = choiceOf(item).variation;
    return inStock(v) ? v : undefined;
  };

  const addOne = (item: LookItem) => {
    const v = buyable(item);
    if (!v) return;
    addToCart(item.product, v, 1);
    setJustAdded(item.productId);
    window.setTimeout(() => setJustAdded(null), 1400);
  };

  const addAll = () => {
    if (!look) return;
    let skipped = 0;
    look.items.forEach(item => {
      const v = buyable(item);
      if (v) addToCart(item.product, v, 1); else skipped += 1;
    });
    toast(skipped ? copy.someMissing : copy.addedAll, skipped ? 'info' : 'success');
  };

  // Tapping a dot on a phone must show something: the piece is below the picture.
  const showPiece = (productId: string) => {
    setActive(productId);
    const card = document.getElementById(`look-piece-${productId}`);
    if (!card) return;
    // Only when it is out of sight: on a wide screen both are already visible.
    const box = card.getBoundingClientRect();
    if (box.top < 80 || box.bottom > window.innerHeight) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const total = look
    ? look.items.reduce((sum, item) => {
        const v = buyable(item);
        return v ? sum + getUnitPrice(item.product, v) : sum;
      }, 0)
    : 0;

  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12" data-testid="looks-page">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-candy-100 text-candy-700 flex items-center justify-center">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">{copy.title}</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">{copy.lead}</p>
      </div>

      <div className="flex justify-center gap-2 mb-8" role="tablist">
        {([[0, copy.all], [1, copy.boys], [2, copy.girls]] as const).map(([code, label]) => (
          <button
            key={code}
            role="tab"
            aria-selected={gender === code}
            onClick={() => setGender(code)}
            className={`px-5 py-2 rounded-full text-sm font-black border transition-colors ${
              gender === code ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="h-96 rounded-3xl bg-slate-100 animate-pulse" />}

      {!loading && !look && (
        <div className="text-center py-20 text-slate-500 font-bold">{copy.empty}</div>
      )}

      {!loading && look && (
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          {/* Stage */}
          <div className="relative rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm lg:sticky lg:top-24"
               style={{ background: `radial-gradient(circle at 50% 35%, ${look.accentColor}22, ${look.accentColor}08 55%, #fff 100%)` }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={look.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="relative mx-auto aspect-[3/4] max-h-[70vh] w-full touch-pan-y"
                drag={visible.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) < 60) return;
                  // Dragging towards the right reveals what sits on the left,
                  // which in a right-to-left language is the next look.
                  go((info.offset.x > 0) === (dir === 'rtl') ? 1 : -1);
                }}
              >
                <img src={look.imageUrl} alt={localized(look.title, look.titleKu, look.titleAr, language)}
                     className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                {look.items.map((item, i) => (
                  <button
                    key={item.productId}
                    onClick={() => showPiece(item.productId)}
                    aria-label={productName(item.product, language)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shadow-lg border-2 border-white transition-transform ${
                      active === item.productId ? 'scale-125 bg-slate-900 text-white' : 'bg-white text-slate-900 hover:scale-110'
                    }`}
                    style={{ left: `${item.hotspotX}%`, top: `${item.hotspotY}%` }}
                  >
                    {i + 1}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>

            {visible.length > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label={copy.prev}
                        className="absolute top-1/2 -translate-y-1/2 start-3 w-11 h-11 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white">
                  <Prev className="w-5 h-5" />
                </button>
                <button onClick={() => go(1)} aria-label={copy.next}
                        className="absolute top-1/2 -translate-y-1/2 end-3 w-11 h-11 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-700 hover:bg-white">
                  <Next className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="p-5 text-center bg-white/70 backdrop-blur border-t border-slate-100">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                {copy.look} <bdi dir="ltr">{index + 1} / {visible.length}</bdi>{look.ageRange ? <> · <bdi dir="ltr">{look.ageRange}</bdi></> : null}
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{localized(look.title, look.titleKu, look.titleAr, language)}</h2>
              {localized(look.subtitle, look.subtitleKu, look.subtitleAr, language) && (
                <p className="text-sm text-slate-500 mt-1">{localized(look.subtitle, look.subtitleKu, look.subtitleAr, language)}</p>
              )}
              {visible.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {visible.map((l, i) => (
                    <button key={l.id} onClick={() => { setIndex(i); setActive(null); }} aria-label={`${copy.look} ${i + 1}`}
                            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-slate-900' : 'w-2 bg-slate-300'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pieces */}
          <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm p-5 sm:p-6">
            {lookSizes.length > 0 && (
              <div className="mb-5 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-sm font-black text-slate-800">{copy.yourSize}</span>
                  <span className="text-[11px] text-slate-500 text-end">{childSize ? '' : copy.sizeHint}</span>
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.yourSize}>
                  {lookSizes.map(s => (
                    <button key={s} role="radio" aria-checked={childSize === s}
                            onClick={() => setChildSize(childSize === s ? null : s)}
                            className={`min-w-12 px-3 h-9 rounded-full text-xs font-black border transition-colors ${
                              childSize === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}>
                      {getLocalizedSizeName(s, language)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">{copy.pieces}</h3>
            <div className="space-y-3">
              {look.items.map((item, i) => {
                const p = item.product;
                const pick = choiceOf(item);
                const list = p.variations ?? [];
                const colors: string[] = Array.from(new Set<string>(list.map(v => v.color).filter(Boolean)));
                const sizes: string[] = sortSizes(Array.from(new Set<string>(list.filter(v => v.color === pick.color).map(v => v.size).filter(Boolean))));
                const v = pick.variation;
                const available = inStock(v);
                const unit = getUnitPrice(p, v);
                const was = Number(p.price) > unit && !v?.priceOverride ? Number(p.price) : 0;

                return (
                  <div key={item.productId} id={`look-piece-${item.productId}`}
                       className={`rounded-2xl border p-3 transition-colors ${active === item.productId ? 'border-slate-900 bg-slate-50' : 'border-slate-100'}`}
                       onMouseEnter={() => setActive(item.productId)}>
                    <div className="flex gap-3">
                      <Link to={`/product/${p.id}`} className="relative shrink-0 w-20 h-24 rounded-xl overflow-hidden bg-slate-100" aria-label={copy.view}>
                        {firstImage(p) && <img src={firstImage(p)} alt="" className="w-full h-full object-cover" />}
                        <span className="absolute top-1 start-1 w-5 h-5 rounded-full bg-white text-[10px] font-black flex items-center justify-center shadow">{i + 1}</span>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${p.id}`} className="block text-sm font-black text-slate-800 leading-snug line-clamp-2">
                          {productName(p, language)}
                        </Link>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm font-black text-candy-700">{formatIQDLabel(unit)}</span>
                          {was > 0 && <span className="text-[11px] font-bold text-slate-400 line-through">{formatIQDLabel(was)}</span>}
                        </div>

                        {colors.length > 0 && (
                          <div className="flex gap-1.5 mt-2" aria-label={copy.color}>
                            {colors.map(c => (
                              <button key={c} onClick={() => setOwn(item, { color: c })}
                                      title={getLocalizedColorName(c, language)}
                                      aria-pressed={pick.color === c}
                                      className={`w-6 h-6 rounded-full border-2 ${pick.color === c ? 'border-slate-900 ring-2 ring-offset-1 ring-slate-300' : 'border-slate-200'}`}
                                      style={{ background: getColorHex(c) }} />
                            ))}
                          </div>
                        )}

                        {childSize && (
                          <div className={`mt-2 text-[11px] font-black ${available ? 'text-slate-500' : 'text-candy-700'}`}>
                            {available ? <>{copy.size}: <bdi dir="ltr">{getLocalizedSizeName(childSize, language)}</bdi></> : copy.notInSize}
                          </div>
                        )}

                        {!childSize && sizes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2" aria-label={copy.size}>
                            {sizes.map(s => {
                              const sv = list.find(x => x.color === pick.color && x.size === s);
                              const out = !inStock(sv);
                              return (
                                <button key={s} onClick={() => setOwn(item, { size: s })} aria-pressed={pick.size === s}
                                        className={`min-w-9 px-2 h-7 rounded-lg text-[11px] font-black border ${
                                          pick.size === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                                        } ${out ? 'opacity-40 line-through' : ''}`}>
                                  {getLocalizedSizeName(s, language)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => addOne(item)} disabled={!available}
                            className={`mt-3 w-full h-10 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors ${
                              !available ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : justAdded === item.productId ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'
                            }`}>
                      {!available ? (childSize ? copy.notInSize : copy.soldOut) : justAdded === item.productId
                        ? (<><Check className="w-4 h-4" />{copy.added}</>)
                        : (<><Plus className="w-4 h-4" />{copy.addPiece}</>)}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-500">{copy.total}</span>
              <span className="text-lg font-black text-slate-900">{formatIQDLabel(total)}</span>
            </div>
            <button onClick={addAll} disabled={total === 0}
                    className="mt-3 w-full h-12 rounded-2xl bg-candy-600 text-white font-black flex items-center justify-center gap-2 hover:bg-candy-700 disabled:opacity-40">
              <ShoppingBag className="w-5 h-5" />{copy.addAll}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Looks;
