import { formatIQDLabel } from './currency';

const esc = (v: any) => String(v ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

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
