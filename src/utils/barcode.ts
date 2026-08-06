import JsBarcode from 'jsbarcode';

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
