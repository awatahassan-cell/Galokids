import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Minus, Plus, ShoppingBag, ArrowLeft, ArrowRight, Tag, X, Loader2, Package } from 'lucide-react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';
import { formatIQDLabel } from '../utils/currency';
import { getLineTotal, roundIQD } from '../utils/pricing';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../utils/colors';

/**
 * The basket, as a page.
 *
 * The drawer is for a glance; this is where a parent actually sits and edits
 * the order — change quantities, drop a line, try a code — before going on to
 * checkout. Totals are computed the same way as the drawer and the checkout,
 * and the delivery estimate comes from the same server quote, so the number
 * shown here is the number that will be charged.
 */
export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartItemQuantity, appliedCoupon, setAppliedCoupon, applyCoupon, fetchShippingQuote } =
    useStore();
  const { t, language } = useLanguage();
  const isRTL = language === 'ku' || language === 'ar';
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const items = (cart || []).filter(Boolean);
  const count = items.reduce((n, i) => n + (i.quantity || 0), 0);

  const subtotal = roundIQD(items.reduce((acc, item) => acc + getLineTotal(item.product, item.variation, item.quantity), 0));
  const discount = appliedCoupon ? roundIQD(subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const goodsTotal = subtotal - discount;

  // The same quote the checkout uses, without a governorate — an estimate the
  // customer can refine once they pick one.
  const [shippingFee, setShippingFee] = useState(0);
  const [freeOver, setFreeOver] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (goodsTotal <= 0) { setShippingFee(0); setFreeOver(0); return; }
    fetchShippingQuote(undefined, goodsTotal)
      .then(q => { if (!cancelled) { setShippingFee(q.fee); setFreeOver(q.freeOver); } })
      .catch(() => { /* keep the last known figure */ });
    return () => { cancelled = true; };
  }, [goodsTotal, fetchShippingQuote]);

  const total = goodsTotal + shippingFee;
  const missingForFree = freeOver > 0 ? Math.max(0, freeOver - goodsTotal) : 0;

  const productName = (p: any) =>
    (language === 'ku' && p.nameKu) || (language === 'ar' && p.nameAr) || p.name;

  const handleCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    const res = await applyCoupon(couponCode.trim());
    setCouponBusy(false);
    if (res.success) setCouponCode('');
    else setCouponError(res.message || L('کۆدەکە دروست نییە', 'الكود غير صالح', 'That code is not valid'));
  };

  const Forward = isRTL ? ArrowLeft : ArrowRight;
  const Back = isRTL ? ArrowRight : ArrowLeft;

  /* ------------------------------------------------------------ empty --- */
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 font-arabic">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-[28px] bg-gradient-to-br from-candy-100 to-bubble-100 grid place-items-center">
            <ShoppingBag className="w-11 h-11 text-candy-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {L('سەبەتەکەت بەتاڵە', 'سلتك فارغة', 'Your basket is empty')}
          </h1>
          <p className="text-sm font-bold text-slate-500 mb-7">
            {L(
              'هێشتا هیچت زیاد نەکردووە — با پێکەوە شتێکی جوان بدۆزینەوە.',
              'لم تضف شيئاً بعد — لنجد شيئاً جميلاً معاً.',
              'Nothing here yet — let’s find something lovely.'
            )}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-candy-500 hover:bg-candy-600 text-white font-black text-sm px-7 py-3.5 rounded-full transition-colors shadow-lg shadow-candy-500/25"
          >
            {L('دەستپێکردنی کڕین', 'ابدأ التسوق', 'Start shopping')}
            <Forward className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------- filled --- */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 font-arabic">
      <span className="vk-sub">{count} {L('بەرهەم', 'منتج', count === 1 ? 'item' : 'items')}</span>
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-7">
        {L('سەبەتەی ', 'سلة ', 'My shopping ')}
        <span className="vk-hi">{L('کڕینەکەم', 'التسوق', 'basket')}</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr] lg:gap-8 items-start">

        {/* ------------------------------------------------------ lines --- */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-6 shadow-sm">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`grid grid-cols-[88px_1fr] gap-4 py-4 items-center ${
                idx < items.length - 1 ? 'border-b border-dashed border-slate-200' : ''
              }`}
            >
              <Link
                to={`/product/${item.product.id}`}
                className="aspect-square rounded-[18px] bg-gradient-to-br from-candy-50 to-bubble-100 grid place-items-center overflow-hidden"
              >
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={productName(item.product)} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-2/5 h-2/5 text-candy-400" />
                )}
              </Link>

              <div className="min-w-0">
                <Link to={`/product/${item.product.id}`} className="block">
                  <h4 className="text-[14.5px] font-extrabold text-slate-900 mb-0.5 line-clamp-1 hover:text-candy-700 transition-colors">
                    {productName(item.product)}
                  </h4>
                </Link>
                <p className="text-[12.5px] text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
                  {item.variation.color && (
                    <>
                      <span
                        className="w-3 h-3 rounded-full border border-slate-200 shrink-0"
                        style={{ backgroundColor: getColorHex(item.variation.color) }}
                      />
                      {getLocalizedColorName(item.variation.color, language)}
                    </>
                  )}
                  {item.variation.color && item.variation.size && <span aria-hidden="true">·</span>}
                  {item.variation.size && getLocalizedSizeName(item.variation.size, language)}
                  {item.product.sku && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono" dir="ltr">{item.product.sku}</span>
                    </>
                  )}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2.5 mt-2.5">
                  <div className="inline-flex items-center gap-1 bg-slate-100 rounded-full p-1">
                    <button
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-7 h-7 grid place-items-center rounded-full text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label={L('کەمکردنەوە', 'إنقاص', 'Decrease')}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono px-1 text-sm font-black text-slate-800 min-w-[1.75rem] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.variation.stockQuantity}
                      className="w-7 h-7 grid place-items-center rounded-full text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      aria-label={L('زیادکردن', 'زيادة', 'Increase')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="font-mono text-base font-black text-candy-700">
                    {formatIQDLabel(getLineTotal(item.product, item.variation, item.quantity))}
                  </p>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-[12.5px] text-slate-500 hover:text-candy-700 underline transition-colors cursor-pointer"
                  >
                    {t('remove') || L('سڕینەوە', 'حذف', 'Remove')}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="pt-5 mt-1 border-t border-dashed border-slate-200">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 border border-slate-200 hover:border-candy-300 hover:text-candy-700 text-slate-800 font-black text-sm px-6 py-3 rounded-full transition-colors"
            >
              <Back className="w-4 h-4" />
              {L('بەردەوامبە بە کڕین', 'متابعة التسوق', 'Continue shopping')}
            </Link>
          </div>
        </div>

        {/* ---------------------------------------------------- summary --- */}
        <aside className="bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-[19px] font-black text-slate-900 mb-4">
            {L('کورتەی داواکاری', 'ملخص الطلب', 'Order summary')}
          </h2>

          {/* How close the basket is to free delivery. */}
          {missingForFree > 0 && (
            <div className="bg-sunny-50 border border-[#FBEBC8] rounded-2xl px-4 py-3.5 mb-4">
              <p className="text-[12.5px] font-bold text-slate-700 mb-2.5">
                🎉 <span className="font-mono">{formatIQDLabel(missingForFree)}</span>{' '}
                {L('ماوە بۆ گەیاندنی بێ بەرامبەر', 'متبقٍ للتوصيل المجاني', 'away from free delivery')}
              </p>
              <div className="h-2 rounded-full bg-[#F3E6C4] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sunny-500 to-mint-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.round((goodsTotal / freeOver) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 text-sm text-slate-500 font-semibold py-1.5">
            <span>{t('subtotal') || L('کۆی بەرهەمەکان', 'المجموع الفرعي', 'Subtotal')}</span>
            <b className="font-mono text-slate-900 font-extrabold">{formatIQDLabel(subtotal)}</b>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between gap-3 text-sm text-slate-500 font-semibold py-1.5">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Tag className="w-3.5 h-3.5 text-mint-700 shrink-0" />
                <span className="truncate">{L('داشکاندن', 'خصم', 'Discount')} ({appliedCoupon.code})</span>
                <button
                  onClick={() => setAppliedCoupon(null)}
                  className="text-slate-400 hover:text-candy-700 cursor-pointer shrink-0"
                  aria-label={L('لابردنی کۆد', 'إزالة الكود', 'Remove code')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
              <b className="font-mono text-mint-700 font-extrabold">−{formatIQDLabel(discount)}</b>
            </div>
          )}

          <div className="flex justify-between gap-3 text-sm text-slate-500 font-semibold py-1.5">
            <span>{L('گەیاندن', 'التوصيل', 'Delivery')}</span>
            {shippingFee > 0 ? (
              <b className="font-mono text-slate-900 font-extrabold">{formatIQDLabel(shippingFee)}</b>
            ) : (
              <b className="text-mint-700 font-extrabold">{L('بێ بەرامبەر', 'مجاني', 'Free')}</b>
            )}
          </div>
          <p className="text-[11px] font-bold text-slate-400 -mt-0.5 mb-1">
            {L(
              'کۆتا نرخی گەیاندن لە پەڕەی پارەدان دیاری دەکرێت بەپێی پارێزگا.',
              'يُحتسب التوصيل النهائي في صفحة الدفع حسب المحافظة.',
              'Final delivery is set at checkout, by governorate.'
            )}
          </p>

          <div className="flex justify-between gap-3 border-t-2 border-dashed border-slate-200 mt-2.5 pt-4 text-[17px] font-black text-slate-900">
            <span>{L('کۆی گشتی', 'الإجمالي', 'Total')}</span>
            <b className="font-mono text-[23px] text-candy-700">{formatIQDLabel(total)}</b>
          </div>

          {!appliedCoupon && (
            <>
              <div className="flex gap-2.5 mt-4">
                <input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCoupon(); }}
                  placeholder={L('کۆدی داشکاندن', 'كود الخصم', 'Discount code')}
                  className="flex-1 min-w-0 border-[1.5px] border-slate-200 rounded-full px-5 py-3 text-[13.5px] font-bold outline-none focus:border-candy-400 transition-colors"
                />
                <button
                  onClick={handleCoupon}
                  disabled={couponBusy || !couponCode.trim()}
                  className="bg-ink-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[13.5px] font-black px-6 rounded-full transition-colors cursor-pointer shrink-0 inline-flex items-center gap-2"
                >
                  {couponBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {L('بەکاربێنە', 'تطبيق', 'Apply')}
                </button>
              </div>
              {couponError && <p className="text-xs font-bold text-red-600 mt-2">{couponError}</p>}
            </>
          )}

          <button
            onClick={() => navigate('/checkout')}
            className="w-full mt-4 bg-candy-500 hover:bg-candy-600 text-white font-black text-sm py-4 rounded-full transition-colors shadow-lg shadow-candy-500/25 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {L('بەردەوامبە بۆ پارەدان', 'متابعة الدفع', 'Continue to checkout')}
            <Forward className="w-4 h-4" />
          </button>
        </aside>
      </div>
    </div>
  );
};
