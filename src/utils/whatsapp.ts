// WhatsApp deep-link helpers. Set VITE_WHATSAPP_NUMBER in .env (international
// format, digits only, e.g. 9647501234567). This uses click-to-chat links only
// — no automated messaging — so it works without any paid API.
export const WHATSAPP_NUMBER: string =
  ((import.meta as any).env?.VITE_WHATSAPP_NUMBER as string) || '9647500000000';

export const whatsappLink = (text: string, number: string = WHATSAPP_NUMBER): string => {
  const digits = (number || '').replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

export const shareOnWhatsApp = (text: string): string =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;
