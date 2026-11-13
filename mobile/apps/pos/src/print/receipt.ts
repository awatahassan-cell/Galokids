import { formatDateTime, formatIQD, orderStatusLabel, type Order } from '@galokids/core';

/**
 * The paper a customer takes away.
 *
 * Built from the same fields the website's receipt prints — store name, logo,
 * address, phone, invoice number, lines, discount, coupon, total, paid, change
 * and the footer line — so a receipt printed from the app and one printed from
 * the website are the same piece of paper. Handed to the same print path the
 * labels use: the system print service on a phone, an offscreen frame on the
 * web.
 */

export interface StoreInfo {
  store_name?: string | null;
  store_logo?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  receipt_footer?: string | null;
}

const esc = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string
  );

/** Pick the shop's details out of whatever the settings endpoint returned. */
export function storeInfo(settings: Record<string, unknown> | null | undefined): StoreInfo {
  const text = (key: string) => {
    const value = settings?.[key];
    return typeof value === 'string' && value.trim() ? value : null;
  };

  return {
    store_name: text('store_name'),
    store_logo: text('store_logo'),
    store_address: text('store_address'),
    store_phone: text('store_phone'),
    receipt_footer: text('receipt_footer'),
  };
}

export function buildReceiptHtml(order: Order, store: StoreInfo = {}): string {
  const lines = order.items
    .map(item => {
      const name = item.product_name_ku || item.product_name || 'بەرهەم';
      const returned = item.returned_quantity ?? 0;

      return `<tr>
        <td>${esc(name)}${item.variation_label ? `<br><small>${esc(item.variation_label)}</small>` : ''}${
          returned > 0 ? `<br><small>گەڕێنراوەتەوە: ${returned}</small>` : ''
        }</td>
        <td class="c">${item.quantity}</td>
        <td class="e">${esc(formatIQD(item.price * item.quantity))}</td>
      </tr>`;
    })
    .join('');

  const money = (label: string, amount: number, sign = '') =>
    `<tr><td>${esc(label)}</td><td class="e">${esc(formatIQD(sign ? -amount : amount))}</td></tr>`;

  const cash = order.payment_method === 'cash';

  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
    <title>${esc(order.invoice_no ?? `#${order.id}`)}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; color: #000; font-family: 'Courier New', 'IBM Plex Sans Arabic', monospace; }
      body { width: 280px; margin: 0 auto; padding: 8px; }
      h2 { text-align: center; margin: 4px 0; font-size: 18px; }
      img.logo { display: block; margin: 0 auto 6px; max-width: 120px; max-height: 70px; object-fit: contain; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      td, th { padding: 3px 0; border-bottom: 1px dashed #999; text-align: right; }
      .c { text-align: center; } .e { text-align: left; }
      .tot td { border: none; font-size: 13px; }
      .big td { font-weight: bold; font-size: 15px; }
      small { color: #555; }
      .center { text-align: center; font-size: 11px; margin: 3px 0; }
      .inv { text-align: center; font-weight: bold; font-size: 13px; margin: 6px 0; }
    </style></head><body>
    ${store.store_logo ? `<img class="logo" src="${esc(store.store_logo)}" />` : ''}
    <h2>${esc(store.store_name || 'Galo Kids')}</h2>
    ${store.store_address ? `<p class="center">${esc(store.store_address)}</p>` : ''}
    ${store.store_phone ? `<p class="center">☎ ${esc(store.store_phone)}</p>` : ''}
    <p class="inv">${esc(order.invoice_no ?? `#${order.id}`)}</p>
    <p class="center">${esc(formatDateTime(order.created_at))}</p>
    ${order.customer_name ? `<p class="center">کڕیار: ${esc(order.customer_name)}</p>` : ''}
    ${order.status && order.channel !== 'pos' ? `<p class="center">دۆخ: ${esc(orderStatusLabel(order.status))}</p>` : ''}
    <table><thead><tr><th>بەرهەم</th><th class="c">دانە</th><th class="e">نرخ</th></tr></thead>
    <tbody>${lines}</tbody></table>
    <table style="margin-top:8px"><tbody class="tot">
      ${money('کۆی بەرهەمەکان', order.subtotal)}
      ${order.discount_amount ? money(order.coupon_code ? `داشکاندن (${order.coupon_code})` : 'داشکاندن', order.discount_amount, '-') : ''}
      ${order.shipping_fee ? money('گەیاندن', order.shipping_fee) : ''}
      <tr class="big"><td>کۆی گشتی</td><td class="e">${esc(formatIQD(order.total_amount))}</td></tr>
      ${order.refunded_amount ? money('گەڕێنراوەتەوە', order.refunded_amount, '-') : ''}
      ${order.amount_paid != null ? money(`وەرگیرا (${cash ? 'کاش' : order.payment_method ?? ''})`, order.amount_paid) : ''}
      ${cash && order.change_due ? money('ماوە بۆ کڕیار', order.change_due) : ''}
    </tbody></table>
    <p class="center" style="margin-top:8px">${esc(store.receipt_footer || 'سوپاس بۆ کڕینتان ❤')}</p>
    </body></html>`;
}

/** A delivery slip: who it goes to, where, and how much to collect. */
export function buildWaybillHtml(order: Order, store: StoreInfo = {}): string {
  // Cash on delivery is collected at the door; anything paid online is not.
  const method = (order.payment_method ?? '').toLowerCase();
  const toCollect = !method || method.includes('cash') || method.includes('cod') ? order.total_amount : 0;

  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
    <title>${esc(order.invoice_no ?? `#${order.id}`)}</title>
    <style>
      @page { size: A5; margin: 10mm; }
      * { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; color: #000; }
      h1 { font-size: 20px; margin: 0 0 8px; } .box { border: 2px solid #000; padding: 10px; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; }
      .big { font-size: 22px; font-weight: bold; }
    </style></head><body>
    <h1>${esc(store.store_name || 'Galo Kids')} — ${esc(order.invoice_no ?? `#${order.id}`)}</h1>
    <div class="box">
      <div class="row"><span>ناو</span><b>${esc(order.customer_name ?? '')}</b></div>
      <div class="row"><span>مۆبایل</span><b dir="ltr">${esc(order.customer_phone ?? '')}</b></div>
      <div class="row"><span>پارێزگا</span><b>${esc(order.governorate ?? '')}</b></div>
      <div class="row"><span>ناونیشان</span><b>${esc(order.shipping_address ?? '')}</b></div>
    </div>
    <div class="box"><div class="row big"><span>بڕی وەرگرتن</span><span>${esc(formatIQD(toCollect))}</span></div></div>
    <p>${order.items.map(i => `${esc(i.product_name_ku || i.product_name || '')} ×${i.quantity}`).join(' ، ')}</p>
    </body></html>`;
}

/** A wa.me link with the order summarised in Kurdish, as the website sends it. */
export function whatsappUrl(order: Order): string | null {
  let phone = (order.customer_phone ?? '').replace(/\D/g, '');
  if (!phone) return null;
  if (phone.startsWith('07')) phone = '964' + phone.slice(1);
  else if (phone.startsWith('7')) phone = '964' + phone;

  const lines = order.items
    .map(
      i =>
        `• ${i.product_name_ku || i.product_name || 'کاڵا'}${i.variation_label ? ` (${i.variation_label})` : ''} × ${i.quantity} = ${formatIQD(i.price * i.quantity)}`
    )
    .join('\n');

  const message = [
    `سڵاو بەڕێز ${order.customer_name || 'کڕیاری خۆشەویست'} 🎈`,
    'سوپاس بۆ داواکارییەکەت لە گەلۆ کیدز (Galo Kids).',
    `ژمارەی پسوولە: ${order.invoice_no ?? order.id}`,
    '',
    '📦 کاڵاکان:',
    lines,
    '--------------------------',
    `🏷️ کۆی کاڵاکان: ${formatIQD(order.subtotal)}`,
    order.discount_amount > 0 ? `🎁 داشکاندن: ${formatIQD(-order.discount_amount)}` : null,
    `🚚 کرێی گەیاندن: ${order.shipping_fee > 0 ? formatIQD(order.shipping_fee) : 'بێ بەرامبەر (خۆڕایی)'}`,
    `💰 کۆی گشتی: ${formatIQD(order.total_amount)}`,
    order.shipping_address ? `📍 ناونیشان: ${[order.governorate, order.shipping_address].filter(Boolean).join(' - ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
