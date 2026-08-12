/**
 * The shop's clock.
 *
 * "Today" has to mean the same day on the screen as it does on the server, and
 * the server keeps Baghdad time. Deriving it from `toISOString()` gave the UTC
 * day instead: for the three hours after midnight in Erbil the admin panel was
 * still filtering on yesterday, so a sale rung up at 00:30 was missing from
 * "today" and the day's takings looked short.
 *
 * Reading it off the browser's own clock is no better — the owner checking the
 * shop from another country would see a different day than the shop did.
 */
export const SHOP_TIMEZONE = 'Asia/Baghdad';

// en-CA formats as YYYY-MM-DD, which is exactly the shape the API and the
// stored order dates use.
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar day a moment falls on in the shop's timezone: "2026-08-12". */
export const shopDate = (when: Date = new Date()): string => dayFormatter.format(when);

/** Today in the shop. */
export const shopToday = (): string => shopDate();

/** The day `n` days before today, in the shop. */
export const shopDaysAgo = (n: number): string => shopDate(new Date(Date.now() - n * 86400000));

/** The month a moment falls in: "2026-08". */
export const shopMonth = (when: Date = new Date()): string => shopDate(when).slice(0, 7);

/** The year a moment falls in: "2026". */
export const shopYear = (when: Date = new Date()): string => shopDate(when).slice(0, 4);

/** The first day of the shop's current month, as a date string. */
export const shopMonthStart = (): string => `${shopMonth()}-01`;

/** The first day of the shop's current year, as a date string. */
export const shopYearStart = (): string => `${shopYear()}-01-01`;

/**
 * The parts of the shop's current date, for building a calendar.
 *
 * Returned as numbers because the calendar screens do arithmetic on them.
 */
export const shopDateParts = (when: Date = new Date()): { year: number; month: number; day: number } => {
  const [year, month, day] = shopDate(when).split('-').map(Number);
  return { year, month, day };
};
