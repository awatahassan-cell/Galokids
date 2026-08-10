/**
 * Phone number normalization & comparison utilities for Iraqi phone formats.
 */

export const normalizePhone = (phone: string | number | undefined | null): string => {
  if (phone === undefined || phone === null) return '';
  let digits = String(phone).replace(/[^\d]/g, '');
  if (!digits) return '';

  // Remove leading international prefixes
  if (digits.startsWith('00964')) {
    digits = digits.substring(5);
  } else if (digits.startsWith('964')) {
    digits = digits.substring(3);
  } else if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  return digits;
};

export const isSamePhone = (
  phone1: string | number | undefined | null,
  phone2: string | number | undefined | null
): boolean => {
  if (!phone1 || !phone2) return false;
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  if (n1.length >= 8 && n2.length >= 8) {
    return n1.slice(-8) === n2.slice(-8);
  }
  return false;
};

export const formatIraqiPhone = (phone: string | number | undefined | null): string => {
  const norm = normalizePhone(phone);
  if (!norm) return '';
  return '964' + norm;
};
