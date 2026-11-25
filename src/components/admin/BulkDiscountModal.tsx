import React, { useEffect, useMemo, useState } from 'react';
import { X, Percent, AlertTriangle, Tag } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useConfirm } from '../ui/Feedback';
import { apiFetch } from '../../config/api';
import { formatIQDLabel } from '../../utils/currency';
import type { Category } from '../../types';

/**
 * One percentage off the catalogue.
 *
 * Until now a sale meant opening every product and typing a new price. This
 * sets each product's discount price from its list price — the list price is
 * never touched — for everything, one section, or the products ticked.
 *
 * The numbers are shown BEFORE anything is saved (the server answers a dry
 * run), including products that would fall below what they cost, so the admin
 * is not discovering a loss afterwards.
 */

interface Preview {
  affected: number;
  skipped_existing: number;
  skipped_too_small: number;
  below_cost: number;
  variations_with_own_price: number;
  samples: { id: number; name: string; name_ku?: string | null; price: number; old_discount_price: number | null; new_discount_price: number | null }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  /** Ticked products in the list, if any. */
  selectedIds: string[];
  /** Called after a change was saved, so the list can reload. */
  onDone: () => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESETS = [10, 15, 20, 25, 30, 40, 50];

export const BulkDiscountModal: React.FC<Props> = ({ isOpen, onClose, categories, selectedIds, onDone, toast }) => {
  const { language } = useLanguage();
  const confirm = useConfirm();
  const T = (ku: string, ar: string, en: string) => (language === 'ku' ? ku : language === 'ar' ? ar : en);

  const [percent, setPercent] = useState<number>(20);
  const [scope, setScope] = useState<'all' | 'category' | 'ids'>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [keepExisting, setKeepExisting] = useState(false);
  const [roundTo, setRoundTo] = useState(250);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening with products ticked means "these"; otherwise everything.
  useEffect(() => {
    if (isOpen) {
      setScope(selectedIds.length > 0 ? 'ids' : 'all');
      setPreview(null);
      setError(null);
    }
  }, [isOpen, selectedIds.length]);

  useEffect(() => {
    if (scope === 'category' && !categoryId && categories[0]) setCategoryId(String(categories[0].id));
  }, [scope, categoryId, categories]);

  const body = useMemo(() => ({
    scope,
    ...(scope === 'category' ? { category_id: Number(categoryId) } : {}),
    ...(scope === 'ids' ? { ids: selectedIds.map(Number) } : {}),
    keep_existing: keepExisting,
    round_to: roundTo,
  }), [scope, categoryId, selectedIds, keepExisting, roundTo]);

  const call = async (pct: number, dryRun: boolean): Promise<Preview> => {
    const response = await apiFetch('/products/bulk-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, percent: pct, dry_run: dryRun }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const first = json?.errors ? (Object.values(json.errors as Record<string, string[]>)[0]?.[0]) : null;
      throw new Error(first || json?.message || `Request failed (${response.status})`);
    }
    return json as Preview;
  };

  // Live preview: re-asked whenever a choice changes.
  useEffect(() => {
    if (!isOpen) return;
    if (scope === 'category' && !categoryId) return;
    if (!(percent >= 1 && percent <= 90)) { setPreview(null); return; }
    let live = true;
    const timer = window.setTimeout(() => {
      call(percent, true)
        .then(result => { if (live) { setPreview(result); setError(null); } })
        .catch(e => { if (live) { setPreview(null); setError(e.message); } });
    }, 250);
    return () => { live = false; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, percent, body]);

  if (!isOpen) return null;

  const scopeLabel =
    scope === 'all' ? T('هەموو کاڵاکان', 'كل المنتجات', 'all products')
    : scope === 'ids' ? T(`${selectedIds.length} کاڵای هەڵبژێردراو`, `${selectedIds.length} منتجات محددة`, `${selectedIds.length} selected products`)
    : T('ئەم بەشە', 'هذا القسم', 'this section');

  const apply = async () => {
    const ok = await confirm({
      title: T('داشکاندن جێبەجێ بکرێت؟', 'تطبيق الخصم؟', 'Apply discount?'),
      message: T(
        `٪${percent} داشکاندن بۆ ${preview?.affected ?? 0} کاڵا (${scopeLabel}). نرخی ئاسایی ناگۆڕدرێت و دەتوانیت هەر کاتێک لابیبەیت.`,
        `خصم ${percent}٪ على ${preview?.affected ?? 0} منتج (${scopeLabel}). لن يتغير السعر الأصلي ويمكنك إزالته في أي وقت.`,
        `${percent}% off ${preview?.affected ?? 0} products (${scopeLabel}). List prices are not changed and you can remove it any time.`
      ),
      confirmText: T('جێبەجێ بکە', 'تطبيق', 'Apply'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await call(percent, false);
      toast(T(`داشکاندن بۆ ${result.affected} کاڵا جێبەجێ کرا`, `تم تطبيق الخصم على ${result.affected} منتج`, `Discount applied to ${result.affected} products`), 'success');
      onDone();
      onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: T('داشکاندنەکان لابدرێن؟', 'إزالة الخصومات؟', 'Remove discounts?'),
      message: T(
        `هەموو نرخە داشکێنراوەکان لەسەر ${scopeLabel} لادەبرێن و نرخی ئاسایی دەگەڕێتەوە. ئەمە داشکاندنی دەستی هەر کاڵایەکیش دەگرێتەوە.`,
        `ستتم إزالة كل الأسعار المخفّضة على ${scopeLabel} ويعود السعر الأصلي، بما فيها الخصومات اليدوية.`,
        `Every discounted price on ${scopeLabel} is removed and the list price returns — including discounts set by hand.`
      ),
      confirmText: T('لابدە', 'إزالة', 'Remove'),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await call(0, false);
      toast(T(`داشکاندن لە ${result.affected} کاڵا لابرا`, `أُزيل الخصم عن ${result.affected} منتج`, `Discount removed from ${result.affected} products`), 'success');
      onDone();
      onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean) =>
    `px-4 h-10 rounded-full text-sm font-black border transition-colors ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`;
  const sampleName = (s: Preview['samples'][number]) => (language === 'ku' && s.name_ku) || s.name;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl max-h-full overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-black text-slate-900 flex items-center gap-2"><Percent className="w-5 h-5 text-candy-600" />{T('داشکاندنی کۆمەڵ', 'خصم جماعي', 'Bulk discount')}</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">{T('چەند سەدا؟', 'كم النسبة؟', 'How much?')}</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p} onClick={() => setPercent(p)} className={chip(percent === p)} aria-pressed={percent === p}>%{p}</button>
              ))}
              <div className="flex items-center gap-1">
                <input type="number" min={1} max={90} value={PRESETS.includes(percent) ? '' : percent}
                       onChange={e => setPercent(Number(e.target.value))} placeholder="%"
                       className="w-20 h-10 rounded-full border border-slate-200 px-3 text-sm font-black text-center focus:outline-none focus:border-slate-900" aria-label={T('سەدای تر', 'نسبة أخرى', 'Other percent')} />
              </div>
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">{T('لەسەر چی؟', 'على ماذا؟', 'Apply to')}</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setScope('all')} className={chip(scope === 'all')}>{T('هەموو کاڵاکان', 'كل المنتجات', 'All products')}</button>
              <button onClick={() => setScope('category')} className={chip(scope === 'category')}>{T('یەک بەش', 'قسم واحد', 'One section')}</button>
              {selectedIds.length > 0 && (
                <button onClick={() => setScope('ids')} className={chip(scope === 'ids')}>{T(`${selectedIds.length} هەڵبژێردراو`, `${selectedIds.length} محدد`, `${selectedIds.length} selected`)}</button>
              )}
            </div>
            {scope === 'category' && (
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                      className="mt-3 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{(language === 'ku' && (c as any).nameKu) || c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-5 h-5" checked={keepExisting} onChange={e => setKeepExisting(e.target.checked)} />
              <span>{T('ئەوانەی پێشتر داشکاندنی دەستیان هەیە نەگۆڕدرێن', 'لا تغيّر ما له خصم يدوي', 'Keep products that already have a hand-set discount')}</span>
            </label>
            <label className="text-sm font-bold text-slate-700">
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">{T('نرخ بکرێتە نزیکترین', 'تقريب السعر إلى', 'Round price to')}</span>
              <select value={roundTo} onChange={e => setRoundTo(Number(e.target.value))} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold">
                {[1, 50, 100, 250, 500, 1000].map(n => <option key={n} value={n}>{n === 1 ? T('بێ خڕکردنەوە', 'بدون تقريب', 'No rounding') : formatIQDLabel(n)}</option>)}
              </select>
            </label>
          </div>

          {/* The numbers, before anything is saved. */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3" aria-live="polite">
            {error && <p className="text-sm font-bold text-candy-700">{error}</p>}
            {!error && !preview && <p className="text-sm text-slate-400 font-bold">…</p>}
            {preview && (
              <>
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Tag className="w-4 h-4" />
                  {T(`${preview.affected} کاڵا داشکاندنیان دەبێت`, `${preview.affected} منتج سيُخفَّض`, `${preview.affected} products will be discounted`)}
                </div>
                {preview.samples.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-700 truncate">{sampleName(s)}</span>
                    <span className="shrink-0">
                      <span className="text-slate-400 line-through">{formatIQDLabel(s.price)}</span>{' '}
                      <span className="font-black text-candy-700">{formatIQDLabel(Number(s.new_discount_price ?? s.price))}</span>
                    </span>
                  </div>
                ))}
                {preview.skipped_existing > 0 && (
                  <p className="text-[11px] text-slate-500 font-bold">{T(`${preview.skipped_existing} کاڵا بەهۆی داشکاندنی دەستییەوە نەگۆڕدران`, `${preview.skipped_existing} منتج تُرك بسبب خصمه اليدوي`, `${preview.skipped_existing} kept because they already have a discount`)}</p>
                )}
                {preview.skipped_too_small > 0 && (
                  <p className="text-[11px] text-slate-500 font-bold">{T(`${preview.skipped_too_small} کاڵا نرخیان زۆر بچووکە بۆ داشکاندن`, `${preview.skipped_too_small} منتج سعره صغير جداً للخصم`, `${preview.skipped_too_small} too cheap to discount`)}</p>
                )}
                {preview.variations_with_own_price > 0 && (
                  <p className="text-[11px] text-amber-700 font-bold">{T(`${preview.variations_with_own_price} قەبارە نرخی تایبەتی خۆیان هەیە و ناگۆڕدرێن`, `${preview.variations_with_own_price} مقاس له سعر خاص ولن يتغير`, `${preview.variations_with_own_price} sizes have their own price and are not changed`)}</p>
                )}
                {preview.below_cost > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-candy-700 font-black">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {T(`${preview.below_cost} کاڵا بە کەمتر لە تێچووی کڕین دەفرۆشرێن — بە زیان!`, `${preview.below_cost} منتج سيُباع بأقل من تكلفته — بخسارة!`, `${preview.below_cost} products would sell below what they cost — at a loss!`)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={remove} disabled={busy}
                  className="h-11 px-4 rounded-xl border border-candy-200 text-candy-700 text-sm font-black hover:bg-candy-50 disabled:opacity-50">
            {T('لابردنی داشکاندنەکان', 'إزالة الخصومات', 'Remove discounts')}
          </button>
          <button onClick={apply} disabled={busy || !preview || preview.affected === 0}
                  className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-700 disabled:opacity-40">
            {busy ? '…' : T(`جێبەجێکردنی %${percent}`, `تطبيق ${percent}%`, `Apply ${percent}%`)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDiscountModal;
