import React, { useEffect, useMemo, useState } from 'react';
import { X, Percent, AlertTriangle, Tag, DollarSign, Check, Trash2, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useConfirm } from '../ui/Feedback';
import { apiFetch } from '../../config/api';
import { formatIQDLabel } from '../../utils/currency';
import type { Category, Product } from '../../types';

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
  /** Specific single product if opened from that row's discount button. */
  targetProduct?: Product | null;
  /** Direct product updater for immediate save on single product */
  updateProduct?: (product: Product) => Promise<any>;
  /** Called after a change was saved, so the list can reload. */
  onDone: () => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PERCENT_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50];
const FIXED_PRESETS = [1000, 2000, 2500, 3000, 5000, 10000, 15000];

export const BulkDiscountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  categories,
  selectedIds,
  targetProduct,
  updateProduct,
  onDone,
  toast,
}) => {
  const { language } = useLanguage();
  const confirm = useConfirm();
  const T = (ku: string, ar: string, en: string) => (language === 'ku' ? ku : language === 'ar' ? ar : en);

  // Discount mode: Percentage or Fixed Amount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [percent, setPercent] = useState<number>(20);
  const [fixedAmount, setFixedAmount] = useState<number>(2500);

  // For single product: direct input of the final discounted price
  const [finalPriceInput, setFinalPriceInput] = useState<string>('');

  const [scope, setScope] = useState<'all' | 'category' | 'ids'>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [keepExisting, setKeepExisting] = useState(false);
  const [roundTo, setRoundTo] = useState(250);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Is this discounting a specific single product?
  const isSingle = Boolean(targetProduct);

  useEffect(() => {
    if (isOpen) {
      if (targetProduct) {
        setScope('ids');
        const price = Number(targetProduct.price || 0);
        const currentDiscount = targetProduct.discountPrice ? Number(targetProduct.discountPrice) : null;
        if (currentDiscount && currentDiscount > 0 && currentDiscount < price) {
          const diff = price - currentDiscount;
          setFixedAmount(diff);
          setFinalPriceInput(String(currentDiscount));
          const calculatedPct = Math.round((diff / price) * 100);
          if (calculatedPct > 0 && calculatedPct <= 90) setPercent(calculatedPct);
        } else {
          setFinalPriceInput(String(Math.max(0, price - 2500)));
          setFixedAmount(2500);
          setPercent(20);
        }
      } else {
        setScope(selectedIds.length > 0 ? 'ids' : 'all');
      }
      setPreview(null);
      setError(null);
    }
  }, [isOpen, targetProduct, selectedIds.length]);

  useEffect(() => {
    if (scope === 'category' && !categoryId && categories[0]) setCategoryId(String(categories[0].id));
  }, [scope, categoryId, categories]);

  // Sync fixed amount with final price input for single product
  const handleFixedAmountChange = (amount: number) => {
    setFixedAmount(amount);
    if (targetProduct) {
      const price = Number(targetProduct.price || 0);
      setFinalPriceInput(String(Math.max(0, price - amount)));
    }
  };

  const handleFinalPriceChange = (val: string) => {
    setFinalPriceInput(val);
    const num = Number(val);
    if (targetProduct && !isNaN(num)) {
      const price = Number(targetProduct.price || 0);
      setFixedAmount(Math.max(0, price - num));
    }
  };

  // Single product calculation
  const singleCalc = useMemo(() => {
    if (!targetProduct) return null;
    const price = Number(targetProduct.price || 0);
    const cost = Number(targetProduct.cost || 0);
    let newPrice: number;
    let deduction: number;

    if (discountType === 'percentage') {
      deduction = roundTo > 1 ? Math.round((price * (percent / 100)) / roundTo) * roundTo : Math.round(price * (percent / 100));
      newPrice = Math.max(0, price - deduction);
    } else {
      deduction = fixedAmount;
      newPrice = Math.max(0, price - deduction);
      if (roundTo > 1) {
        newPrice = Math.round(newPrice / roundTo) * roundTo;
        deduction = price - newPrice;
      }
    }

    const calculatedPct = price > 0 ? Math.round((deduction / price) * 100) : 0;
    const isBelowCost = cost > 0 && newPrice < cost;

    return {
      price,
      cost,
      deduction,
      newPrice,
      calculatedPct,
      isBelowCost,
    };
  }, [targetProduct, discountType, percent, fixedAmount, roundTo]);

  const body = useMemo(() => ({
    discount_type: discountType,
    percent: discountType === 'percentage' ? percent : undefined,
    amount: discountType === 'fixed' ? fixedAmount : undefined,
    scope,
    ...(scope === 'category' ? { category_id: Number(categoryId) } : {}),
    ...(scope === 'ids' ? { ids: isSingle && targetProduct ? [Number(targetProduct.id)] : selectedIds.map(Number) } : {}),
    keep_existing: keepExisting,
    round_to: roundTo,
  }), [discountType, percent, fixedAmount, scope, categoryId, isSingle, targetProduct, selectedIds, keepExisting, roundTo]);

  const call = async (val: number, dryRun: boolean): Promise<Preview> => {
    const payload = {
      ...body,
      discount_type: discountType,
      percent: discountType === 'percentage' ? val : 0,
      amount: discountType === 'fixed' ? val : 0,
      dry_run: dryRun,
    };

    const response = await apiFetch('/products/bulk-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const first = json?.errors ? (Object.values(json.errors as Record<string, string[]>)[0]?.[0]) : null;
      throw new Error(first || json?.message || `Request failed (${response.status})`);
    }
    return json as Preview;
  };

  // Live preview for multi-product
  useEffect(() => {
    if (!isOpen || isSingle) return;
    if (scope === 'category' && !categoryId) return;
    if (discountType === 'percentage' && !(percent >= 1 && percent <= 90)) { setPreview(null); return; }
    if (discountType === 'fixed' && !(fixedAmount > 0)) { setPreview(null); return; }

    let live = true;
    const val = discountType === 'percentage' ? percent : fixedAmount;
    const timer = window.setTimeout(() => {
      call(val, true)
        .then(result => { if (live) { setPreview(result); setError(null); } })
        .catch(e => { if (live) { setPreview(null); setError(e.message); } });
    }, 250);

    return () => { live = false; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSingle, discountType, percent, fixedAmount, body]);

  if (!isOpen) return null;

  const scopeLabel =
    isSingle && targetProduct ? (language === 'ku' && targetProduct.nameKu ? targetProduct.nameKu : targetProduct.name)
    : scope === 'all' ? T('هەموو کاڵاکان', 'كل المنتجات', 'all products')
    : scope === 'ids' ? T(`${selectedIds.length} کاڵای هەڵبژێردراو`, `${selectedIds.length} منتجات محددة`, `${selectedIds.length} selected products`)
    : T('ئەم بەشە', 'هذا القسم', 'this section');

  const apply = async () => {
    if (isSingle && targetProduct && singleCalc) {
      if (singleCalc.newPrice >= singleCalc.price) {
        toast(T('دەبێت نرخی نوێ کەمتر بێت لە نرخی سەرەکی', 'يجب أن يكون السعر الجديد أقل من السعر الأصلي', 'Discounted price must be lower than original price'), 'error');
        return;
      }
      setBusy(true);
      try {
        if (updateProduct) {
          await updateProduct({
            ...targetProduct,
            discountPrice: singleCalc.newPrice,
          });
        } else {
          await call(discountType === 'percentage' ? percent : fixedAmount, false);
        }
        toast(
          T(
            `داشکاندن بە سەرکەوتوویی جێبەجێ کرا (${formatIQDLabel(singleCalc.newPrice)})`,
            `تم تطبيق الخصم بنجاح (${formatIQDLabel(singleCalc.newPrice)})`,
            `Discount applied successfully (${formatIQDLabel(singleCalc.newPrice)})`
          ),
          'success'
        );
        onDone();
        onClose();
      } catch (e: any) {
        toast(e.message || 'Error applying discount', 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Bulk apply
    const ok = await confirm({
      title: T('داشکاندن جێبەجێ بکرێت؟', 'تطبيق الخصم؟', 'Apply discount?'),
      message: T(
        `${discountType === 'percentage' ? `٪${percent}` : formatIQDLabel(fixedAmount)} داشکاندن بۆ ${preview?.affected ?? 0} کاڵا (${scopeLabel}). نرخی ئاسایی ناگۆڕدرێت و دەتوانیت هەر کاتێک لابیبەیت.`,
        `خصم ${discountType === 'percentage' ? `${percent}٪` : formatIQDLabel(fixedAmount)} على ${preview?.affected ?? 0} منتج (${scopeLabel}). لن يتغير السعر الأصلي ويمكنك إزالته في أي وقت.`,
        `${discountType === 'percentage' ? `${percent}%` : formatIQDLabel(fixedAmount)} off ${preview?.affected ?? 0} products (${scopeLabel}). List prices are not changed and you can remove it any time.`
      ),
      confirmText: T('جێبەجێ بکە', 'تطبيق', 'Apply'),
    });
    if (!ok) return;

    setBusy(true);
    try {
      const val = discountType === 'percentage' ? percent : fixedAmount;
      const result = await call(val, false);
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
    if (isSingle && targetProduct) {
      setBusy(true);
      try {
        if (updateProduct) {
          await updateProduct({
            ...targetProduct,
            discountPrice: null as any,
          });
        } else {
          await call(0, false);
        }
        toast(T('داشکاندنی بەرهەمەکە لابرا', 'تمت إزالة الخصم عن المنتج', 'Product discount removed'), 'success');
        onDone();
        onClose();
      } catch (e: any) {
        toast(e.message, 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    const ok = await confirm({
      title: T('داشکاندنەکان لابدرێن؟', 'إزالة الخصومات؟', 'Remove discounts?'),
      message: T(
        `هەموو نرخە داشکێنراوەکان لەسەر ${scopeLabel} لادەبرێن و نرخی ئاسایی دەگەڕێتەوە.`,
        `ستتم إزالة كل الأسعار المخفّضة على ${scopeLabel} ويعود السعر الأصلي.`,
        `Every discounted price on ${scopeLabel} is removed and the list price returns.`
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
    `px-3.5 h-9 rounded-full text-xs font-black border transition-all cursor-pointer ${
      active
        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
    }`;

  const sampleName = (s: Preview['samples'][number]) => (language === 'ku' && s.name_ku) || s.name;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-6 font-arabic" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                {isSingle ? T('داشکاندنی بەرهەم', 'خصم المنتج', 'Product Discount') : T('داشکاندنی بەکۆمەڵ', 'خصم جماعي', 'Bulk Discount')}
              </h3>
              <p className="text-[11px] font-bold text-slate-400">
                {isSingle && targetProduct ? ((language === 'ku' && targetProduct.nameKu) || targetProduct.name) : scopeLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* If single product, show quick product info card */}
          {isSingle && targetProduct && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <img
                src={targetProduct.imageUrl || (targetProduct.images && targetProduct.images[0]) || '/placeholder.png'}
                alt=""
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  {(language === 'ku' && targetProduct.nameKu) || targetProduct.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 font-bold">{T('نرخی ئێستا:', 'السعر الحالي:', 'Current Price:')}</span>
                  <span className="text-xs font-black text-slate-900">{formatIQDLabel(Number(targetProduct.price || 0))}</span>
                  {targetProduct.discountPrice && Number(targetProduct.discountPrice) > 0 && (
                    <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {T('داشکێندراو:', 'مخفض:', 'Sale:')} {formatIQDLabel(Number(targetProduct.discountPrice))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher: Percentage vs Fixed Amount */}
          <div>
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              {T('جۆری داشکاندن', 'نوع الخصم', 'Discount Type')}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  discountType === 'percentage'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Percent className="w-3.5 h-3.5 text-rose-500" />
                <span>{T('بە ڕێژە (٪)', 'نسبة مئوية (٪)', 'Percentage (%)')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  discountType === 'fixed'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>{T('بڕی سابت (دینار)', 'مبلغ ثابت (د.ع)', 'Fixed Amount (IQD)')}</span>
              </button>
            </div>
          </div>

          {/* Amount / Percentage Configuration */}
          {discountType === 'percentage' ? (
            <div>
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                {T('ڕێژەی داشکاندن (٪)', 'نسبة الخصم (٪)', 'Discount Percentage (%)')}
              </span>
              <div className="flex flex-wrap gap-2">
                {PERCENT_PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => setPercent(p)} className={chip(percent === p)}>
                    %{p}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={PERCENT_PRESETS.includes(percent) ? '' : percent}
                    onChange={(e) => setPercent(Number(e.target.value))}
                    placeholder="%"
                    className="w-20 h-9 rounded-full border border-slate-200 px-3 text-xs font-black text-center focus:outline-none focus:border-slate-900"
                    aria-label={T('ڕێژەی تر', 'نسبة أخرى', 'Custom percent')}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                {T('بڕی داشکاندن (بە دینار داشکێنە)', 'مبلغ الخصم (خصم بالدينار)', 'Discount Deduction (IQD)')}
              </span>
              <div className="flex flex-wrap gap-2 mb-3">
                {FIXED_PRESETS.map((amt) => (
                  <button key={amt} type="button" onClick={() => handleFixedAmountChange(amt)} className={chip(fixedAmount === amt)}>
                    -{formatIQDLabel(amt)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {T('بڕی داشکاندن لە نرخەکە:', 'مقدار الخصم من السعر:', 'Discount amount to deduct:')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={250}
                      min={0}
                      value={fixedAmount}
                      onChange={(e) => handleFixedAmountChange(Number(e.target.value))}
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-900 focus:outline-none focus:border-slate-900"
                      placeholder="2500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">د.ع</span>
                  </div>
                </div>

                {isSingle && targetProduct && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {T('یان ڕاستەوخۆ نرخی نوێ:', 'أو السعر النهائي مباشرة:', 'Or set final sale price:')}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={250}
                        min={0}
                        value={finalPriceInput}
                        onChange={(e) => handleFinalPriceChange(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs font-black text-rose-600 focus:outline-none focus:border-slate-900"
                        placeholder="18000"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">د.ع</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scope selection for Bulk mode only */}
          {!isSingle && (
            <div>
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                {T('لەسەر چ کاڵایەک جێبەجێ بێت؟', 'تطبيق على ماذا؟', 'Apply to')}
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setScope('all')} className={chip(scope === 'all')}>
                  {T('هەموو کاڵاکان', 'كل المنتجات', 'All products')}
                </button>
                <button type="button" onClick={() => setScope('category')} className={chip(scope === 'category')}>
                  {T('یەک بەش', 'قسم واحد', 'One section')}
                </button>
                {selectedIds.length > 0 && (
                  <button type="button" onClick={() => setScope('ids')} className={chip(scope === 'ids')}>
                    {T(`${selectedIds.length} هەڵبژێردراو`, `${selectedIds.length} محدد`, `${selectedIds.length} selected`)}
                  </button>
                )}
              </div>
              {scope === 'category' && (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-3 w-full h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(language === 'ku' && (c as any).nameKu) || c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Rounding & options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {!isSingle && (
              <label className="flex items-start gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                  checked={keepExisting}
                  onChange={(e) => setKeepExisting(e.target.checked)}
                />
                <span>{T('ئەوانەی پێشتر داشکاندنیان هەیە نەگۆڕدرێن', 'تخطي ما له خصم مسبق', 'Keep products with existing discount')}</span>
              </label>
            )}
            <label className="text-xs font-bold text-slate-700">
              <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {T('نرخ نزیکبکرێتەوە بۆ:', 'تقريب السعر إلى:', 'Round price to:')}
              </span>
              <select
                value={roundTo}
                onChange={(e) => setRoundTo(Number(e.target.value))}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800"
              >
                {[1, 50, 100, 250, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? T('بێ خڕکردنەوە', 'بدون تقريب', 'No rounding') : formatIQDLabel(n)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Single Product Live Result Card */}
          {isSingle && singleCalc && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">{T('نرخی سەرەکی:', 'السعر الأصلي:', 'Original Price:')}</span>
                <span className="font-black text-slate-800">{formatIQDLabel(singleCalc.price)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">{T('بڕی داشکاندن:', 'مبلغ الخصم:', 'Discount Amount:')}</span>
                <span className="font-black text-rose-600">
                  -{formatIQDLabel(singleCalc.deduction)} (%{singleCalc.calculatedPct})
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {T('نرخی فرۆشتنی نوێ:', 'سعر البيع الجديد:', 'New Sale Price:')}
                </span>
                <span className="text-base font-black text-rose-600">{formatIQDLabel(singleCalc.newPrice)}</span>
              </div>

              {singleCalc.isBelowCost && (
                <div className="flex items-start gap-2 bg-rose-50 text-rose-800 p-2.5 rounded-xl border border-rose-200 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    {T(
                      `ئاگاداری: ئەم نرخە (${formatIQDLabel(singleCalc.newPrice)}) لە خوار تێچووی کڕینە (${formatIQDLabel(singleCalc.cost)}) — بە زیان دەفرۆشرێت!`,
                      `تحذير: هذا السعر (${formatIQDLabel(singleCalc.newPrice)}) أقل من التكلفة (${formatIQDLabel(singleCalc.cost)}) — يباع بخسارة!`,
                      `Warning: Price (${formatIQDLabel(singleCalc.newPrice)}) is below cost (${formatIQDLabel(singleCalc.cost)}) — selling at a loss!`
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bulk mode preview */}
          {!isSingle && (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3" aria-live="polite">
              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
              {!error && !preview && <p className="text-xs text-slate-400 font-bold">…</p>}
              {preview && (
                <>
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <Tag className="w-4 h-4 text-rose-500" />
                    {T(`${preview.affected} کاڵا داشکاندنیان دەبێت`, `${preview.affected} منتج سيُخفَّض`, `${preview.affected} products will be discounted`)}
                  </div>
                  {preview.samples.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-700 truncate">{sampleName(s)}</span>
                      <span className="shrink-0">
                        <span className="text-slate-400 line-through">{formatIQDLabel(s.price)}</span>{' '}
                        <span className="font-black text-rose-600">{formatIQDLabel(Number(s.new_discount_price ?? s.price))}</span>
                      </span>
                    </div>
                  ))}
                  {preview.below_cost > 0 && (
                    <p className="flex items-start gap-1.5 text-xs text-rose-700 font-black">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {T(
                        `${preview.below_cost} کاڵا بە کەمتر لە تێچووی کڕین دەفرۆشرێن — بە زیان!`,
                        `${preview.below_cost} منتج سيُباع بأقل من تكلفته — بخسارة!`,
                        `${preview.below_cost} products would sell below what they cost — at a loss!`
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-xs">
          <button
            type="button"
            onClick={remove}
            disabled={busy || (isSingle && (!targetProduct?.discountPrice || Number(targetProduct.discountPrice) <= 0))}
            className="h-11 px-4 rounded-xl border border-rose-200 text-rose-700 text-xs font-black hover:bg-rose-50 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{T('لابردنی داشکاندن', 'إزالة الخصم', 'Remove Discount')}</span>
          </button>

          <button
            type="button"
            onClick={apply}
            disabled={busy || (!isSingle && (!preview || preview.affected === 0))}
            className="h-11 px-6 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
          >
            {busy ? (
              '…'
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {isSingle
                    ? T('جێبەجێکردنی داشکاندن', 'تطبيق الخصم', 'Apply Discount')
                    : T(
                        `جێبەجێکردن (${discountType === 'percentage' ? `%${percent}` : `-${formatIQDLabel(fixedAmount)}`})`,
                        `تطبيق (${discountType === 'percentage' ? `${percent}%` : `-${formatIQDLabel(fixedAmount)}`})`,
                        `Apply (${discountType === 'percentage' ? `${percent}%` : `-${formatIQDLabel(fixedAmount)}`})`
                      )}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDiscountModal;
