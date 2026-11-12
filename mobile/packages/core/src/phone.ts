/**
 * Iraqi numbers, in the one form the server stores.
 *
 * Canonical is `964XXXXXXXXX` — no plus, no leading zero — which mirrors
 * PhoneNumber::normalize() in the backend. Typing 0750…, +964 750… or 750…
 * must all reach the same account, or a customer ends up with three.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;

  let local = digits;
  if (local.startsWith('00964')) local = local.slice(5);
  else if (local.startsWith('964')) local = local.slice(3);
  else if (local.startsWith('0')) local = local.slice(1);

  return local ? `964${local}` : null;
}

export function isValidPhone(input: string | null | undefined): boolean {
  const canonical = normalizePhone(input);
  if (!canonical) return false;

  const local = canonical.slice(3);
  return local.length >= 9 && local.length <= 11;
}

/** `0750 123 4567` — how a person reads it back. */
export function displayPhone(input: string | null | undefined): string {
  const canonical = normalizePhone(input);
  if (!canonical) return '';

  const local = canonical.slice(3);
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`.trim();
}
