import { formatDateTime, formatIQD, type Shift, type ShiftSummary } from '@galokids/core';
import type { StoreInfo } from './receipt';

const esc = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string
  );

/**
 * The end-of-shift slip: what the drawer should hold, what was counted, and
 * the gap. Printed at close and kept with the day's takings.
 */
export function buildZReportHtml(
  summary: ShiftSummary,
  options: { shift?: Shift | null; counted?: number | null; cashier?: string | null; store?: StoreInfo }
): string {
  const { shift, counted, cashier, store } = options;
  const difference = counted != null ? counted - summary.expected_cash : null;

  const row = (label: string, value: string, bold = false) =>
    `<tr${bold ? ' class="b"' : ''}><td>${esc(label)}</td><td class="e">${esc(value)}</td></tr>`;

  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Z-report</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; color: #000; font-family: 'Courier New', 'IBM Plex Sans Arabic', monospace; }
      body { width: 280px; margin: 0 auto; padding: 8px; }
      h2 { text-align: center; margin: 4px 0; font-size: 17px; }
      .center { text-align: center; font-size: 11px; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
      td { padding: 3px 0; border-bottom: 1px dashed #999; text-align: right; }
      .e { text-align: left; } .b td { font-weight: bold; font-size: 14px; }
    </style></head><body>
    <h2>${esc(store?.store_name || 'Galo Kids')}</h2>
    <p class="center">ڕاپۆرتی داخستنی شیفت (Z)</p>
    ${cashier ? `<p class="center">کاشێر: ${esc(cashier)}</p>` : ''}
    ${shift?.opened_at ? `<p class="center">کرایەوە: ${esc(formatDateTime(shift.opened_at))}</p>` : ''}
    <p class="center">چاپکرا: ${esc(formatDateTime(new Date()))}</p>
    <table><tbody>
      ${row('بڕی دەستپێک', formatIQD(summary.opening_float))}
      ${row('ژمارەی فرۆشتنەکان', String(summary.orders_count))}
      ${row('فرۆشتنی نەقد', formatIQD(summary.cash_sales))}
      ${row('فرۆشتنی کارت', formatIQD(summary.card_sales))}
      ${row('کۆی فرۆشتن', formatIQD(summary.total_sales), true)}
      ${row('گەڕاندنەوەکان', formatIQD(-summary.refunds))}
      ${row('پارە چووەتە ناو دراوەر', formatIQD(summary.cash_in))}
      ${row('پارە دەرچووە', formatIQD(-summary.cash_out))}
      ${row('چاوەڕوانکراو لە دراوەر', formatIQD(summary.expected_cash), true)}
      ${counted != null ? row('ژمێردراو', formatIQD(counted)) : ''}
      ${difference != null ? row(difference < 0 ? 'کەمی' : difference > 0 ? 'زیادی' : 'جیاوازی', formatIQD(Math.abs(difference)), true) : ''}
    </tbody></table>
    </body></html>`;
}
