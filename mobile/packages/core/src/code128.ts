/**
 * CODE128 barcodes, as SVG.
 *
 * Written out rather than pulled from a library because the two libraries that
 * would do it both draw to a `<canvas>`, which exists in a browser and not in
 * a React Native app — and the shop needs the same label on a phone, on a
 * tablet and in a browser. An SVG string renders in all three and goes
 * straight into the HTML that the printer is handed.
 *
 * CODE128 is also what the website's sticker printer already uses, so a label
 * printed from the app scans identically to one printed from the panel.
 *
 * Subset B throughout: it covers the whole printable ASCII range, which is
 * what the shop's own `GALO000001` codes need. Subset C would pack digit pairs
 * into half the width, and is a worthwhile thing to add the day a shop
 * complains the labels are too wide — not before.
 */

/**
 * The 107 patterns, from the specification.
 *
 * Each is six digits: the widths of bar, space, bar, space, bar, space in
 * modules. The last (the stop) is seven, because it ends with an extra bar.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

/** Everything subset B can carry: printable ASCII, space through DEL-1. */
export function canEncodeCode128(value: string): boolean {
  return /^[\x20-\x7e]+$/.test(value);
}

/**
 * The pattern indices for a value: start, the data, the check digit, stop.
 *
 * The check digit is the weighted sum the specification defines — the start
 * code plus each character's value times its position, modulo 103. A scanner
 * that reads a barcode whose check digit does not agree reports nothing at
 * all, which is the failure mode worth avoiding: a label that looks right and
 * scans as silence.
 */
function symbolsFor(value: string): number[] {
  const data = [...value].map(character => character.charCodeAt(0) - 32);

  let checksum = START_B;
  data.forEach((code, index) => {
    checksum += code * (index + 1);
  });

  return [START_B, ...data, checksum % 103, STOP];
}

export interface BarcodeSvgOptions {
  /** Width of one module in user units. 2 is the usual minimum for thermal. */
  moduleWidth?: number;
  /** Height of the bars, excluding the text below. */
  height?: number;
  /** Print the value under the bars. */
  showText?: boolean;
  fontSize?: number;
  /**
   * Blank margin at each end, in modules. The specification asks for ten; a
   * scanner needs it to find where the code starts, and labels that drop it
   * are the ones that read on the third try.
   */
  quietZone?: number;
}

export interface BarcodeSvg {
  svg: string;
  width: number;
  height: number;
}

/** Render a value as a CODE128 barcode, as a standalone SVG string. */
export function code128Svg(value: string, options: BarcodeSvgOptions = {}): BarcodeSvg | null {
  const text = String(value ?? '').trim();
  if (!text || !canEncodeCode128(text)) return null;

  const moduleWidth = options.moduleWidth ?? 2;
  const barHeight = options.height ?? 60;
  const showText = options.showText ?? true;
  const fontSize = options.fontSize ?? 12;
  const quietZone = options.quietZone ?? 10;

  const textGap = showText ? fontSize + 4 : 0;
  const totalHeight = barHeight + textGap;

  const rects: string[] = [];
  let x = quietZone;

  for (const symbol of symbolsFor(text)) {
    // Widths alternate bar, space, bar, space…, always starting with a bar.
    let isBar = true;

    for (const digit of PATTERNS[symbol]!) {
      const width = Number(digit);

      if (isBar) {
        rects.push(
          `<rect x="${x * moduleWidth}" y="0" width="${width * moduleWidth}" height="${barHeight}"/>`
        );
      }

      x += width;
      isBar = !isBar;
    }
  }

  const totalModules = x + quietZone;
  const totalWidth = totalModules * moduleWidth;

  const label = showText
    ? `<text x="${totalWidth / 2}" y="${barHeight + fontSize}" text-anchor="middle" ` +
      `font-family="monospace" font-size="${fontSize}" fill="#000">${escapeXml(text)}</text>`
    : '';

  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" ` +
      `viewBox="0 0 ${totalWidth} ${totalHeight}">` +
      `<rect width="100%" height="100%" fill="#fff"/>` +
      `<g fill="#000">${rects.join('')}</g>${label}</svg>`,
    width: totalWidth,
    height: totalHeight,
  };
}

/** An `<img src>` the label HTML can use directly. */
export function code128DataUri(value: string, options?: BarcodeSvgOptions): string | null {
  const rendered = code128Svg(value, options);
  if (!rendered) return null;

  // encodeURIComponent rather than base64: it keeps the SVG readable in a
  // page's source, which matters when a label prints wrong and somebody has
  // to work out why.
  return `data:image/svg+xml;utf8,${encodeURIComponent(rendered.svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Read a rendered barcode's module widths back out.
 *
 * Only used by the tests, which encode a value and decode it again: a barcode
 * that cannot be read back is one a scanner will not read either, and that is
 * not something you want to discover from a roll of printed labels.
 */
export function decodeCode128Widths(widths: number[]): string | null {
  // The stop pattern is seven widths, not six, so it has to come off the end
  // before anything is grouped. Grouping first eats six of its seven as though
  // they were a data symbol, and then the leftover never matches.
  const stopWidth = PATTERNS[STOP]!.length;
  if (widths.length < stopWidth + 12) return null;

  if (widths.slice(-stopWidth).join('') !== PATTERNS[STOP]) return null;

  const body = widths.slice(0, -stopWidth);
  if (body.length % 6 !== 0) return null;

  const groups: string[] = [];
  for (let index = 0; index < body.length; index += 6) {
    groups.push(body.slice(index, index + 6).join(''));
  }

  const symbols = groups.map(group => PATTERNS.indexOf(group));
  if (symbols.some(symbol => symbol < 0) || symbols[0] !== START_B) return null;

  const data = symbols.slice(1, -1);
  const claimed = symbols[symbols.length - 1]!;

  let checksum = START_B;
  data.forEach((code, index) => {
    checksum += code * (index + 1);
  });

  if (checksum % 103 !== claimed) return null;

  return data.map(code => String.fromCharCode(code + 32)).join('');
}

/** The raw module widths for a value, for tests and for anyone drawing it. */
export function code128Widths(value: string): number[] | null {
  if (!canEncodeCode128(value)) return null;

  return symbolsFor(value).flatMap(symbol => [...PATTERNS[symbol]!].map(Number));
}
