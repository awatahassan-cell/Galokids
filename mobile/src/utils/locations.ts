import raw from '../data/iraq-locations.json';
import type { Language } from '../i18n/strings';

/**
 * Where the shop delivers.
 *
 * The same file the website uses, bundled rather than fetched: an address
 * picker that needs a network round trip before it can show a list is the
 * slowest part of a checkout, and the list changes about as often as Iraq
 * gains a governorate.
 *
 * The governorate name is what the server prices delivery from, so it is
 * always sent in English no matter which language the customer picked — a
 * shipping rate saved under "Erbil" would not match "هەولێر".
 */

interface RawDistrict {
  id: string;
  name: string;
  nameAr?: string;
  nameKu?: string;
  subdistricts?: string[];
  subdistrictsAr?: string[];
  subdistrictsKu?: string[];
}

interface RawGovernorate {
  id: string;
  governorate: string;
  governorateAr?: string;
  governorateKu?: string;
  districts?: RawDistrict[];
}

const DATA = raw as RawGovernorate[];

export interface Option {
  /** What is sent to the server. Always the English name. */
  value: string;
  /** What the customer reads. */
  label: string;
}

function localise(language: Language, en: string, ar?: string, ku?: string): string {
  if (language === 'ku') return ku || en;
  if (language === 'ar') return ar || en;
  return en;
}

export function governorates(language: Language): Option[] {
  return DATA.map(entry => ({
    value: entry.governorate,
    label: localise(language, entry.governorate, entry.governorateAr, entry.governorateKu),
  }));
}

export function districtsOf(governorate: string, language: Language): Option[] {
  const found = DATA.find(entry => entry.governorate === governorate);
  if (!found?.districts) return [];

  return found.districts.map(district => ({
    value: district.name,
    label: localise(language, district.name, district.nameAr, district.nameKu),
  }));
}

export function subdistrictsOf(
  governorate: string,
  district: string,
  language: Language
): Option[] {
  const foundGovernorate = DATA.find(entry => entry.governorate === governorate);
  const foundDistrict = foundGovernorate?.districts?.find(entry => entry.name === district);
  if (!foundDistrict?.subdistricts) return [];

  const localised =
    language === 'ku'
      ? foundDistrict.subdistrictsKu
      : language === 'ar'
        ? foundDistrict.subdistrictsAr
        : undefined;

  return foundDistrict.subdistricts.map((name, index) => ({
    value: name,
    label: localised?.[index] ?? name,
  }));
}

/**
 * One line for the order's shipping address.
 *
 * Written in the language the customer used, because a courier in Erbil reads
 * it, not the database — but the governorate is sent separately in English so
 * the delivery charge still resolves.
 */
export function composeAddress(parts: {
  governorateLabel: string;
  districtLabel?: string;
  subdistrictLabel?: string;
  detail?: string;
}): string {
  return [parts.detail, parts.subdistrictLabel, parts.districtLabel, parts.governorateLabel]
    .map(part => part?.trim())
    .filter(Boolean)
    .join('، ');
}
