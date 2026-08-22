/**
 * Iraqi mobile numbers, as customers actually type them.
 *
 * The same number arrives as 0770 123 4567, +964 770 123 4567, 964770…, or
 * with Arabic-Indic digits from an Arabic keyboard. The server normalises to
 * one form; the app checks before spending an SMS on a number that cannot
 * receive one, and shows it back the way people read it.
 */

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** Turn ٠١٢ / ۰۱۲ into 012 so the rest of the code sees plain digits. */
export function toLatinDigits(input: string): string {
  return input.replace(ARABIC_INDIC, char => {
    const code = char.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * The national form: 07XXXXXXXXX, eleven digits.
 * Returns null when the input cannot be one.
 */
export function normalizePhone(input: string): string | null {
  const digits = toLatinDigits(String(input ?? '')).replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.startsWith('00964')) national = national.slice(5);
  else if (national.startsWith('964')) national = national.slice(3);

  if (!national.startsWith('0')) national = `0${national}`;

  // Iraqi mobiles are 07 followed by nine digits.
  if (!/^07\d{9}$/.test(national)) return null;

  return national;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** 0770 123 4567 — grouped the way it is read aloud. */
export function formatPhone(input: string): string {
  const national = normalizePhone(input);
  if (!national) return input;
  return `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}`;
}
