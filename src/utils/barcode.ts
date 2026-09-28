import JsBarcode from 'jsbarcode';
import { Product } from '../types';

/** Every generated code starts with this, so the shop's own stock is obvious. */
export const BARCODE_PREFIX = 'GALO';

/** Digits after the prefix: GALO000001 … GALO999999. */
const SEQUENCE_DIGITS = 6;

/**
 * Every barcode already in use, upper-cased so `galo12` and `GALO12` count as
 * the same code.
 *
 * Both the product's own code and each variation's are collected: a scanner
 * reads one number and has to land on exactly one thing, so the two pools can
 * never be allowed to overlap.
 */
export const collectTakenBarcodes = (products: Product[]): Set<string> => {
  const taken = new Set<string>();

  const add = (value?: string | null) => {
    const code = String(value ?? '').trim().toUpperCase();
    if (code) taken.add(code);
  };

  for (const product of products || []) {
    add(product?.barcode);
    add(product?.sku);
    for (const variation of product?.variations || []) {
      add(variation?.barcode);
      add(variation?.sku);
    }
  }

  return taken;
};

/**
 * The next free GALO code.
 *
 * Sequential rather than random: a shop reads these aloud, writes them on
 * boxes and sorts by them, and GALO000042 is a number a person can carry
 * across a room. It continues from the highest one already used, so codes stay
 * in the order stock was added even after products are deleted.
 *
 * CODE128 — what the sticker printer renders — encodes letters and digits
 * alike, so the prefix scans exactly like a numeric barcode would.
 */
export const nextBarcode = (taken: Set<string> = new Set()): string => {
  const pattern = new RegExp(`^${BARCODE_PREFIX}(\\d+)$`);

  let highest = 0;
  taken.forEach(code => {
    const match = pattern.exec(code);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  });

  let next = highest + 1;
  let candidate = BARCODE_PREFIX + String(next).padStart(SEQUENCE_DIGITS, '0');

  // A code that is not of the GALO form can still collide with one — a shop
  // may have typed GALO000007 by hand. Step past anything already spoken for.
  while (taken.has(candidate)) {
    next += 1;
    candidate = BARCODE_PREFIX + String(next).padStart(SEQUENCE_DIGITS, '0');
  }

  return candidate;
};


/**
 * Renders a CODE128 barcode for the given value and returns a PNG data URL.
 * Used to embed real scannable barcodes into print windows (which are
 * separate documents created via document.write, so images must be
 * pre-rendered to data URLs rather than React-rendered canvases).
 */
export const generateBarcodeDataUrl = (value: string, options?: { height?: number; width?: number }): string | null => {
  if (!value) return null;
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      displayValue: true,
      width: options?.width ?? 2,
      height: options?.height ?? 60,
      margin: 8,
      font: 'monospace',
      fontSize: 14,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};
