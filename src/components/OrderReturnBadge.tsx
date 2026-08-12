import React from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * What happened to an order after it was placed.
 *
 * Two different things can end a sale and a shop needs to tell them apart: a
 * cancellation (called off before it was handed over) and a return (the
 * customer brought it back). A return can also be partial, so the badge says
 * how much of the receipt came back rather than just that something did.
 *
 * Renders nothing for an ordinary in-progress order.
 *
 * Set `standalone` in a table that has no status column of its own — it then
 * also reports cancellations and full returns. Beside a status column those two
 * only repeat what the status already says, so by default the badge stays quiet
 * and speaks up for the one case a status cannot express: a partial return.
 */
export const OrderReturnBadge: React.FC<{
  order: any;
  className?: string;
  standalone?: boolean;
}> = ({ order, className = '', standalone = false }) => {
  const { language } = useLanguage();
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  if (!order) return null;

  const returned = Number(order.returnedQuantity ?? order.returned_quantity ?? 0);
  const total = Number(order.totalQuantity ?? order.total_quantity ?? 0);
  const fully = Boolean(order.fullyReturned ?? order.fully_returned) || (total > 0 && returned >= total);
  const cancelled = standalone && order.status === 'cancelled';

  if (returned <= 0 && !cancelled) return null;
  // "Returned" in the status column already covers a whole receipt coming back.
  if (fully && !standalone && order.status === 'returned') return null;

  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black border whitespace-nowrap';

  // A cancellation with nothing returned is just a cancellation.
  if (returned <= 0) {
    return (
      <span className={`${base} bg-slate-100 text-slate-600 border-slate-200 ${className}`}>
        <XCircle className="w-3 h-3" />
        {L('هەڵوەشاوەتەوە', 'ملغى', 'Cancelled')}
      </span>
    );
  }

  if (fully) {
    return (
      <span className={`${base} bg-amber-50 text-amber-800 border-amber-200 ${className}`}>
        <RotateCcw className="w-3 h-3" />
        {L('گەڕاوەتەوە بە تەواوی', 'مرتجع بالكامل', 'Fully returned')}
      </span>
    );
  }

  return (
    <span className={`${base} bg-amber-50 text-amber-800 border-amber-200 ${className}`}>
      <RotateCcw className="w-3 h-3" />
      <span className="font-sans">{returned}</span>
      {L('لە', 'من', 'of')}
      <span className="font-sans">{total}</span>
      {L('گەڕاوەتەوە', 'مرتجع', 'returned')}
    </span>
  );
};

/**
 * The same fact for one line of the receipt.
 *
 * The order-level badge says how much of the sale came back; this says which
 * products it was. Without it a receipt of four items reading "2 of 5 returned"
 * leaves the shop guessing which two to put back on the shelf.
 */
export const OrderItemReturnNote: React.FC<{ item: any; className?: string }> = ({ item, className = '' }) => {
  const { language } = useLanguage();
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  const returned = Number(item?.returnedQuantity ?? item?.returned_quantity ?? 0);
  if (returned <= 0) return null;

  const quantity = Number(item?.quantity ?? 0);
  const partial = quantity > 0 && returned < quantity;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-800 whitespace-nowrap ${className}`}
    >
      <RotateCcw className="w-2.5 h-2.5" />
      {partial ? (
        <>
          <span className="font-sans">{returned}</span>
          {L('لە', 'من', 'of')}
          <span className="font-sans">{quantity}</span>
          {L('گەڕاوەتەوە', 'مرتجع', 'returned')}
        </>
      ) : (
        L('گەڕاوەتەوە', 'مرتجع', 'Returned')
      )}
    </span>
  );
};
