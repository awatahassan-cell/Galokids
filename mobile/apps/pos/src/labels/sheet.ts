import { code128DataUri, formatIQD } from '@galokids/core';

/**
 * Turning chosen products into a page a printer understands.
 *
 * Deliberately a plain function that returns HTML rather than anything drawn
 * on screen, because the printing itself is the one part of this that is not
 * ours: `expo-print` hands the HTML to the browser's print dialog on the web
 * and to the system print service — AirPrint, Android's — on a phone. Both
 * render HTML and honour `@page`, so one page description covers every way the
 * shop might print.
 *
 * The barcode goes in as an inline SVG data URI from our own encoder, so the
 * printed label does not depend on fetching anything. A label sheet that
 * needed the internet would be useless in the room it is used in.
 */

export interface LabelSpec {
  name: string;
  /** What the scanner reads. CODE128, so printable ASCII only. */
  barcode: string;
  price: number;
  color?: string | null;
  size?: string | null;
  /** How many stickers of this one to print. */
  copies: number;
}

export type LabelPaper = 'roll' | 'a4';

export interface LabelOptions {
  widthMm: number;
  heightMm: number;
  paper: LabelPaper;
  shopName?: string | null;
  showName: boolean;
  showVariant: boolean;
  showPrice: boolean;
  showBarcodeText: boolean;
}

export const LABEL_PRESETS: { id: string; label: string; widthMm: number; heightMm: number }[] = [
  { id: '50x30', label: '50 × 30', widthMm: 50, heightMm: 30 },
  { id: '50x25', label: '50 × 25', widthMm: 50, heightMm: 25 },
  { id: '44x24', label: '44 × 24', widthMm: 44, heightMm: 24 },
  { id: '40x30', label: '40 × 30', widthMm: 40, heightMm: 30 },
  { id: '40x20', label: '40 × 20', widthMm: 40, heightMm: 20 },
  { id: '60x40', label: '60 × 40', widthMm: 60, heightMm: 40 },
  { id: '70x50', label: '70 × 50', widthMm: 70, heightMm: 50 },
];

export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** How many stickers a sheet will actually produce. */
export function labelCount(specs: LabelSpec[]): number {
  return specs.reduce((total, spec) => total + Math.max(0, Math.floor(spec.copies)), 0);
}

/**
 * The whole print job, as one HTML document.
 *
 * Returns null when there is nothing to print, so the caller shows a message
 * rather than opening an empty print dialog.
 */
export function labelSheetHtml(specs: LabelSpec[], options: LabelOptions): string | null {
  const expanded: LabelSpec[] = [];

  for (const spec of specs) {
    const copies = Math.max(0, Math.min(500, Math.floor(spec.copies)));
    for (let index = 0; index < copies; index += 1) expanded.push(spec);
  }

  if (expanded.length === 0) return null;

  // The bars get whatever height is left after the text, with a floor: a
  // barcode under about 8mm tall is read slowly by a cheap scanner and not at
  // all by a phone.
  const textRows =
    (options.shopName ? 1 : 0) +
    (options.showName ? 1 : 0) +
    (options.showVariant ? 1 : 0) +
    (options.showPrice ? 1 : 0) +
    (options.showBarcodeText ? 1 : 0);

  const barHeightMm = Math.max(8, options.heightMm - 4 - textRows * 3.4);

  const cards = expanded
    .map(spec => {
      const variant = [spec.color, spec.size].filter(Boolean).join(' · ');

      // 1.8 modules per unit keeps a 10-character code inside a 40mm label.
      const barcode = code128DataUri(spec.barcode, {
        moduleWidth: 1.8,
        height: 60,
        showText: false,
        quietZone: 10,
      });

      return `
      <div class="label">
        ${options.shopName ? `<div class="shop">${escapeHtml(options.shopName)}</div>` : ''}
        ${options.showName ? `<div class="name">${escapeHtml(spec.name)}</div>` : ''}
        ${options.showVariant && variant ? `<div class="variant">${escapeHtml(variant)}</div>` : ''}
        ${options.showPrice ? `<div class="price">${escapeHtml(formatIQD(spec.price))}</div>` : ''}
        ${
          barcode
            ? `<img class="bars" src="${barcode}" alt="${escapeHtml(spec.barcode)}" />`
            : `<div class="nobars">${escapeHtml(spec.barcode)}</div>`
        }
        ${options.showBarcodeText ? `<div class="code">${escapeHtml(spec.barcode)}</div>` : ''}
      </div>`;
    })
    .join('');

  // A roll prints one sticker per page, because that is what the paper is. A4
  // lays them out in a grid and lets the page break where it will.
  const page =
    options.paper === 'roll'
      ? `@page { size: ${options.widthMm}mm ${options.heightMm}mm; margin: 0; }
         .sheet { display: block; }
         .label { page-break-after: always; break-after: page; }
         .label:last-child { page-break-after: auto; break-after: auto; }`
      : `@page { size: A4; margin: 6mm; }
         .sheet { display: flex; flex-wrap: wrap; gap: 2mm; }
         .label { border: 0.2mm dashed #cbd5e1; }`;

  return `<!doctype html>
<html dir="rtl" lang="ku">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>لەیبل</title>
<style>
  ${page}

  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: -apple-system, "Segoe UI", Tahoma, "Noto Sans Arabic", sans-serif;
    color: #000;
  }

  .label {
    width: ${options.widthMm}mm;
    height: ${options.heightMm}mm;
    padding: 1mm 1.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4mm;
    overflow: hidden;
    text-align: center;
  }

  .shop    { font-size: 2.2mm; font-weight: 700; letter-spacing: 0.2mm; }
  .name    { font-size: 2.6mm; font-weight: 700; line-height: 1.1;
             display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
             overflow: hidden; max-width: 100%; }
  .variant { font-size: 2.2mm; font-weight: 600; }
  .price   { font-size: 3.4mm; font-weight: 800; }
  .bars    { width: 100%; height: ${barHeightMm}mm; object-fit: contain; display: block; }
  .nobars  { font-size: 2.4mm; font-family: monospace; }
  .code    { font-size: 2.2mm; font-family: monospace; letter-spacing: 0.15mm; }
</style>
</head>
<body><div class="sheet">${cards}</div></body>
</html>`;
}
