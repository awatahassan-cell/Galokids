import { formatIQDLabel } from './currency';

/**
 * Escape a value before it goes into a document.write() print template.
 *
 * Product names, SKUs and store settings are typed by staff, and those windows
 * are same-origin: an unescaped `<script>` in a product name would run in the
 * admin's browser when they printed a sheet of labels.
 */
export const escapeHtml = (v: any): string =>
  String(v ?? '').replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  }[c] as string));

const esc = escapeHtml;

export interface PrintReceiptTotals {
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  method: string;
  couponCode?: string;
  couponDiscount?: number;
  cashierName?: string;
}

export const printReceiptIframe = (
  orderItems: any[],
  totals: PrintReceiptTotals,
  custName?: string,
  invoiceNo?: string,
  storeSettings?: any
) => {
  const s = storeSettings || {};
  const storeName = s.store_name || 'Galo Kids 🎈';
  const cashier = totals.cashierName || 'Cashier';

  const rows = orderItems.map(it => {
    const p = it.product || {};
    const name = p.nameKu || p.name || it.name || 'Product';
    const price = Number(p.price || it.price || 0);
    const qty = Number(it.quantity || 1);
    const line = price * qty;
    const variation = it.variation || {};
    const size = variation.size || it.size || '';
    const color = variation.color || it.color || '';
    return `<tr><td>${esc(name)}<br><small>${esc(size)} ${esc(color)}</small></td><td style="text-align:center">${qty}</td><td style="text-align:right">${formatIQDLabel(line)}</td></tr>`;
  }).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(invoiceNo || '')}</title>
    <style>
      *{font-family:'Courier New',monospace;color:#000;box-sizing:border-box}
      body{width:280px;margin:0 auto;padding:10px}
      h2{text-align:center;margin:4px 0;font-size:18px}
      img.logo{display:block;margin:0 auto 6px;max-width:120px;max-height:70px;object-fit:contain}
      table{width:100%;border-collapse:collapse;font-size:12px}
      td,th{padding:3px 0;border-bottom:1px dashed #999}
      .tot td{border:none;font-size:13px}
      .big{font-weight:bold;font-size:15px}
      small{color:#555}
      .center{text-align:center;font-size:11px;margin-top:4px}
      .inv{text-align:center;font-weight:bold;font-size:13px;margin:6px 0}
    </style></head><body>
    <img class="logo" src="${esc(s.store_logo || '/assets/galo-logo.png')}" />
    <h2>${esc(storeName)}</h2>
    ${s.store_address ? `<p class="center">${esc(s.store_address)}</p>` : ''}
    ${s.store_phone ? `<p class="center">☎ ${esc(s.store_phone)}</p>` : ''}
    ${invoiceNo ? `<p class="inv">${esc(invoiceNo)}</p>` : ''}
    <p class="center">${new Date().toLocaleString()}</p>
    <p class="center">Cashier: ${esc(cashier)}</p>
    ${custName ? `<p class="center">Customer: ${esc(custName)}</p>` : ''}
    <table><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <table style="margin-top:8px"><tbody class="tot">
      <tr><td>Subtotal</td><td style="text-align:right">${formatIQDLabel(totals.subtotal)}</td></tr>
      ${totals.discount ? `<tr><td>Discount</td><td style="text-align:right">-${formatIQDLabel(totals.discount)}</td></tr>` : ''}
      ${totals.couponDiscount ? `<tr><td>Coupon (${esc(totals.couponCode || '')})</td><td style="text-align:right">-${formatIQDLabel(totals.couponDiscount)}</td></tr>` : ''}
      <tr class="big"><td>TOTAL</td><td style="text-align:right">${formatIQDLabel(totals.total)}</td></tr>
      <tr><td>Paid (${esc(totals.method)})</td><td style="text-align:right">${formatIQDLabel(totals.paid)}</td></tr>
      ${totals.method === 'cash' ? `<tr><td>Change</td><td style="text-align:right">${formatIQDLabel(totals.change)}</td></tr>` : ''}
    </tbody></table>
    <p class="center">${esc(s.receipt_footer || 'Thank you! ❤️')}</p>
    </body></html>`;

  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0px';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
      }
    }, 200);
  }
};

export interface DeliveryWaybillData {
  invoiceNo?: string;
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  governorate?: string;
  address: string;
  source?: string;
  pageHandle?: string;
  note?: string;
  items: any[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  storeSettings?: any;
}

export const printDeliveryWaybill = (data: DeliveryWaybillData) => {
  const s = data.storeSettings || {};
  const storeName = s.store_name || 'Galo Kids 🎈';
  const storePhone = s.store_phone || '0750 000 0000';

  const rows = data.items.map(it => {
    const p = it.product || {};
    const name = p.nameKu || p.name || it.name || 'Product';
    const price = Number(p.price || it.price || 0);
    const qty = Number(it.quantity || 1);
    const line = price * qty;
    const variation = it.variation || {};
    const size = variation.size || it.size || '';
    const color = variation.color || it.color || '';
    const varText = [size, color].filter(Boolean).join(' - ');
    return `<tr>
      <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">
        <b>${esc(name)}</b>${varText ? `<br><span style="font-size: 11px; color: #555;">(${esc(varText)})</span>` : ''}
      </td>
      <td style="text-align: center; padding: 4px 0; border-bottom: 1px dashed #ccc;">${qty}</td>
      <td style="text-align: right; padding: 4px 0; border-bottom: 1px dashed #ccc;">${formatIQDLabel(line)}</td>
    </tr>`;
  }).join('');

  const html = `<!doctype html>
  <html dir="rtl">
  <head>
    <meta charset="utf-8">
    <title>Waybill ${esc(data.invoiceNo || '')}</title>
    <style>
      * { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111; box-sizing: border-box; }
      body { width: 320px; margin: 0 auto; padding: 12px; font-size: 12px; line-height: 1.4; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
      .header h2 { margin: 2px 0 4px; font-size: 18px; }
      .badge { display: inline-block; background: #000; color: #fff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; margin-bottom: 4px; }
      .box { border: 1.5px solid #000; border-radius: 6px; padding: 8px; margin: 8px 0; background: #fafafa; }
      .box-title { font-weight: bold; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 6px; }
      .row { display: flex; justify-content: space-between; margin: 3px 0; }
      .row.bold { font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
      th { border-bottom: 1.5px solid #000; text-align: right; padding: 3px 0; }
      .collect-box { border: 2px solid #e11d48; background: #fff1f2; border-radius: 6px; padding: 10px; text-align: center; margin: 10px 0; }
      .collect-title { font-size: 11px; font-weight: bold; color: #9f1239; margin-bottom: 2px; }
      .collect-amount { font-size: 20px; font-weight: 900; color: #e11d48; letter-spacing: -0.5px; }
      .footer { text-align: center; font-size: 10px; color: #666; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 6px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="badge">وەصڵی گەیاندن • Delivery Waybill</div>
      <h2>${esc(storeName)}</h2>
      <div style="font-size: 11px;">☎ ${esc(storePhone)}</div>
      ${data.invoiceNo ? `<div style="font-weight: bold; margin-top: 4px; font-family: monospace; font-size: 13px;">${esc(data.invoiceNo)}</div>` : ''}
      <div style="font-size: 10px; color: #555;">${new Date().toLocaleString()}</div>
    </div>

    <!-- Customer Card -->
    <div class="box">
      <div class="box-title">📍 زانیاری کڕیار و گەیاندن</div>
      <div class="row bold"><span>کڕیار:</span> <span>${esc(data.customerName || 'کڕیاری پەیج')}</span></div>
      <div class="row bold"><span>تەلەفۆن:</span> <span dir="ltr" style="font-family: monospace;">${esc(data.customerPhone)}</span></div>
      ${data.customerPhone2 ? `<div class="row"><span>تەلەفۆنی ٢:</span> <span dir="ltr" style="font-family: monospace;">${esc(data.customerPhone2)}</span></div>` : ''}
      ${data.governorate ? `<div class="row"><span>پارێزگا:</span> <b>${esc(data.governorate)}</b></div>` : ''}
      <div class="row" style="margin-top: 4px;"><span>ناونیشان:</span> <span style="text-align: left; max-width: 190px;">${esc(data.address)}</span></div>
      ${data.source ? `<div class="row" style="color: #666; font-size: 10px;"><span>سەرچاوە:</span> <span>${esc(data.source)}${data.pageHandle ? ` (${esc(data.pageHandle)})` : ''}</span></div>` : ''}
      ${data.note ? `<div class="row" style="color: #b91c1c; font-size: 10px;"><span>تێبینی:</span> <span>${esc(data.note)}</span></div>` : ''}
    </div>

    <!-- Items List -->
    <table>
      <thead>
        <tr>
          <th>کاڵا</th>
          <th style="text-align: center;">ژمارە</th>
          <th style="text-align: right;">نرخ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- Totals Breakdown -->
    <div style="margin-top: 8px; font-size: 11px; border-top: 1px solid #ddd; padding-top: 6px;">
      <div class="row"><span>کۆی کاڵاکان:</span> <span>${formatIQDLabel(data.subtotal)}</span></div>
      ${data.discount > 0 ? `<div class="row" style="color: #16a34a;"><span>داشکاندن:</span> <span>-${formatIQDLabel(data.discount)}</span></div>` : ''}
      <div class="row">
        <span>کرێی گەیاندن:</span> 
        <span>${data.shippingFee > 0 ? formatIQDLabel(data.shippingFee) : 'بێ بەرامبەر (خۆڕایی)'}</span>
      </div>
    </div>

    <!-- Collect Amount Highlight -->
    <div class="collect-box">
      <div class="collect-title">
        ${data.paymentMethod.toLowerCase().includes('cash') || data.paymentMethod.toLowerCase().includes('cod')
          ? 'بڕی پارەی داواکراو لە کڕیار (کاش لەکاتی وەرگرتن)'
          : 'شێوازی پارەدان: ' + esc(data.paymentMethod)}
      </div>
      <div class="collect-amount">${formatIQDLabel(data.total)}</div>
    </div>

    <div class="footer">
      <div>سوپاس بۆ کڕینت لە ${esc(storeName)} ❤️</div>
      <div>بۆ هەر پرسیارێک پەیوەندیمان پێوە بکەن: ${esc(storePhone)}</div>
    </div>

    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
  </html>`;

  let iframe = document.getElementById('print-waybill-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-waybill-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0px';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print waybill error:', err);
      }
    }, 250);
  }
};

