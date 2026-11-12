/**
 * Dates, the way the shop's reports want them.
 *
 * Every report endpoint takes plain YYYY-MM-DD and works in the shop's own
 * timezone (Asia/Baghdad, set in the backend config). Building these from a
 * phone's local clock is correct for a shop whose staff are all in Iraq, and
 * wrong in a way worth knowing about for anyone else.
 */

/** YYYY-MM-DD for a Date, in the device's own timezone. */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export interface Range {
  from: string;
  to: string;
  label: string;
}

/** The ranges every report screen offers, so they do not each invent their own. */
export function presetRanges(today: Date = new Date()): Record<string, Range> {
  const start = (daysBack: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    return toDateKey(date);
  };

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    today: { from: toDateKey(today), to: toDateKey(today), label: 'ئەمڕۆ' },
    week: { from: start(6), to: toDateKey(today), label: '٧ ڕۆژ' },
    month: { from: toDateKey(monthStart), to: toDateKey(today), label: 'ئەم مانگە' },
    quarter: { from: start(89), to: toDateKey(today), label: '٩٠ ڕۆژ' },
  };
}

/** `12 تشرینی دووەم` — short, and in the language the shop reads. */
export function formatDay(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ckb-IQ', { day: 'numeric', month: 'long' }).format(date);
}

/** With the time, for a list where two rows can share a day. */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ckb-IQ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "٣ خولەک لەمەوبەر" — for a sync strip or an activity log. */
export function timeAgo(value: string | Date | null): string {
  if (!value) return '—';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'ئێستا';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} خولەک لەمەوبەر`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} کاتژمێر لەمەوبەر`;

  return `${Math.floor(seconds / 86400)} ڕۆژ لەمەوبەر`;
}
