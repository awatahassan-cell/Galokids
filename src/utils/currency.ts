export const formatIQD = (value: number) => {
  return new Intl.NumberFormat('en-IQ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
};

export const formatIQDLabel = (value: number, lang?: string) => {
  const currentLang = lang || (typeof window !== 'undefined' ? localStorage.getItem('kidskart_language') : null) || 'ku';
  const currencySymbol = (currentLang === 'ku' || currentLang === 'ar') ? 'د.ع' : 'IQD';
  // Non-breaking: the unit must never wrap onto a line of its own.
  return `${formatIQD(value)}\u00A0${currencySymbol}`;
};

