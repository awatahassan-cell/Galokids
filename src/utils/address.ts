import iraqLocations from '../data/iraq-locations.json';

/**
 * Iraqi delivery addresses.
 *
 * An address is stored as one human-readable string (that is what the orders,
 * receipts and the admin panel display), but the form that edits it needs the
 * governorate / district / sub-district back as selectable values. Both halves
 * live here so they can never drift apart again.
 *
 * The important rule: the value a `<select>` uses is always the CANONICAL
 * English name, never the translated label. Options used to carry the
 * translated label as their value, so a sub-district picked in Kurdish did not
 * match the value restored from a saved address — the field looked empty and
 * the Nahiya silently disappeared on the next save.
 */

export type Lang = 'en' | 'ku' | 'ar';

export interface AddressParts {
  /** Canonical English governorate name, e.g. "Erbil". */
  governorate: string;
  /** District id (or canonical English name when the entry has no id). */
  district: string;
  /** Canonical English sub-district name, e.g. "Ankawa". */
  subdistrict: string;
  /** Free-text street / neighbourhood. */
  street: string;
}

export const EMPTY_ADDRESS: AddressParts = {
  governorate: '',
  district: '',
  subdistrict: '',
  street: '',
};

const norm = (value: unknown): string => String(value ?? '').toLowerCase().trim();

export const getGovernorateLabel = (gov: any, lang: Lang): string =>
  (lang === 'ku' ? gov?.governorateKu : lang === 'ar' ? gov?.governorateAr : gov?.governorate) || gov?.governorate || '';

export const getDistrictLabel = (dist: any, lang: Lang): string =>
  (lang === 'ku' ? dist?.nameKu : lang === 'ar' ? dist?.nameAr : dist?.name) || dist?.name || '';

export interface SubdistrictOption {
  /** Canonical value used by the <select>. */
  value: string;
  en: string;
  ku: string;
  ar: string;
}

export const findGovernorate = (governorate: string) =>
  iraqLocations.find(g => g.governorate === governorate || g.id === governorate);

export const getDistricts = (governorate: string): any[] =>
  findGovernorate(governorate)?.districts || [];

export const findDistrict = (governorate: string, district: string) =>
  getDistricts(governorate).find(d => d.id === district || d.name === district);

/** Sub-districts of a district, in all three languages, keyed by English name. */
export const getSubdistricts = (governorate: string, district: string): SubdistrictOption[] => {
  const dist = findDistrict(governorate, district);
  if (!dist?.subdistricts) return [];

  return dist.subdistricts.map((sub: string, index: number) => ({
    value: sub,
    en: sub,
    ku: dist.subdistrictsKu?.[index] || sub,
    ar: dist.subdistrictsAr?.[index] || sub,
  }));
};

export const getSubdistrictLabel = (sub: SubdistrictOption, lang: Lang): string =>
  (lang === 'ku' ? sub.ku : lang === 'ar' ? sub.ar : sub.en) || sub.en;

/**
 * Build the stored address string. Governorate, district and sub-district are
 * all written in the shopper's language so the address reads naturally, and
 * the street part stays in parentheses at the end.
 */
export const buildAddress = (
  parts: AddressParts,
  lang: Lang,
  labels: { district: string; subdistrict: string }
): string => {
  const gov = findGovernorate(parts.governorate);
  const street = (parts.street || '').trim();

  if (!gov) {
    return street;
  }

  const dist = findDistrict(parts.governorate, parts.district);
  const sub = getSubdistricts(parts.governorate, parts.district)
    .find(s => s.value === parts.subdistrict);

  let result = getGovernorateLabel(gov, lang);
  if (dist) result += ` - ${labels.district}: ${getDistrictLabel(dist, lang)}`;
  if (sub) result += ` - ${labels.subdistrict}: ${getSubdistrictLabel(sub, lang)}`;
  if (street) result += ` (${street})`;

  return result;
};

/**
 * Read a stored address back into selectable parts. Names are matched in every
 * language, so an address saved in Kurdish still resolves when the shopper
 * later switches the site to English.
 */
export const parseAddress = (address?: string | null): AddressParts => {
  const raw = (address || '').trim();
  if (!raw) return { ...EMPTY_ADDRESS };

  const haystack = norm(raw);
  const result: AddressParts = { ...EMPTY_ADDRESS };

  // Street is whatever sits in the trailing parentheses; if there are none the
  // whole string is treated as free text so nothing is ever lost.
  const streetMatch = raw.match(/\(([^)]*)\)\s*$/);
  result.street = streetMatch ? streetMatch[1].trim() : raw;

  const gov = iraqLocations.find(g =>
    haystack.includes(norm(g.governorate)) ||
    haystack.includes(norm(g.governorateKu)) ||
    haystack.includes(norm(g.governorateAr))
  );
  if (!gov) return result;

  result.governorate = gov.governorate;

  const dist = (gov.districts || []).find((d: any) =>
    haystack.includes(norm(d.name)) ||
    (d.nameKu && haystack.includes(norm(d.nameKu))) ||
    (d.nameAr && haystack.includes(norm(d.nameAr)))
  );
  if (!dist) return result;

  result.district = dist.id || dist.name;

  const sub = getSubdistricts(result.governorate, result.district).find(s =>
    haystack.includes(norm(s.en)) ||
    haystack.includes(norm(s.ku)) ||
    haystack.includes(norm(s.ar))
  );
  if (sub) {
    result.subdistrict = sub.value;
  }

  return result;
};
