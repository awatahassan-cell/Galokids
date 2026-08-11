import React from 'react';

/**
 * Coloured icons, in the same language as the decorative shapes: a pastel
 * fill with a darker stroke of the same hue, drawn on a 24×24 grid.
 *
 * These replace flat single-stroke glyphs in the places a customer actually
 * looks at — the tab bar, the category tiles, the drawer — where a plain grey
 * outline made the storefront read as a generic admin tool rather than a
 * children's shop.
 *
 * They are icons, not decoration, so they take a label from the caller: pass
 * `title` when the icon stands alone, and leave it off when a text label sits
 * next to it (as in the tab bar), so a screen reader is not told twice.
 */

export type KidsIconName =
  | 'home' | 'shop' | 'basket' | 'heart' | 'user'
  | 'shirt' | 'dress' | 'shoes' | 'hat' | 'socks' | 'trousers' | 'jacket'
  | 'toy' | 'baby' | 'bag' | 'gift'
  | 'info' | 'mail' | 'help' | 'truck' | 'box' | 'login' | 'logout'
  | 'shield' | 'register' | 'sparkle';

/** pastel fill, darker stroke of the same hue */
const P = {
  pink: ['#FFB3D9', '#C0506A'],
  rose: ['#FF8FAB', '#C0506A'],
  sun: ['#FFD166', '#B87F14'],
  sky: ['#9EE5FF', '#3E93AE'],
  grape: ['#D4A5FF', '#8E5CB4'],
  mint: ['#7BE8C8', '#06805F'],
  sand: ['#FFDDC2', '#C07A3E'],
  ink: ['#C9CCE4', '#5B5F84'],
} as const;

type Pair = readonly [string, string];

const ICONS: Record<KidsIconName, (c: Pair) => React.ReactNode> = {
  home: ([f, s]) => (
    <>
      <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.6 21v-5.2h4.8V21" stroke={s} strokeWidth="1.4" strokeLinejoin="round" fill="none" />
    </>
  ),
  shop: ([f, s]) => (
    <>
      <rect x="3.2" y="8.5" width="17.6" height="12.3" rx="2.6" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M8.3 8.5V6.9a3.7 3.7 0 0 1 7.4 0v1.6" stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="12.6" r="0.9" fill={s} />
      <circle cx="15" cy="12.6" r="0.9" fill={s} />
    </>
  ),
  basket: ([f, s]) => (
    <>
      <path d="M4 9h16l-1.4 10.1a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.6 9 12 3.4 15.4 9" stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  heart: ([f, s]) => (
    <path
      d="M12 20.4S3.8 15.5 3.8 9.9A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8.2 2.3c0 5.6-8.2 10.5-8.2 10.5Z"
      fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  user: ([f, s]) => (
    <>
      <circle cx="12" cy="8.2" r="3.9" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0" fill={f} stroke={s} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  shirt: ([f, s]) => (
    <path
      d="M8.5 3.4 4 5.9l1.6 4 2-.8V20a1 1 0 0 0 1 1h6.8a1 1 0 0 0 1-1V9.1l2 .8 1.6-4-4.5-2.5a3.6 3.6 0 0 1-6.9 0Z"
      fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  dress: ([f, s]) => (
    <>
      <path d="M9 3h6l-1 3.6 4.6 12.1a1.6 1.6 0 0 1-1.5 2.3H6.9a1.6 1.6 0 0 1-1.5-2.3L10 6.6Z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 6.6h4" stroke={s} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  shoes: ([f, s]) => (
    <>
      <path d="M3 16.2c0-1 .3-4.6.6-5.4.3-.6 1.5-.6 2 0l1.7 2 4.8 1.4 6.6 1.8c1.5.4 2.3 1 2.3 2.2v1.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.4 14.2 10 16m2.4-1 1.6 1.8" stroke={s} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  hat: ([f, s]) => (
    <>
      <path d="M6.4 14.6a5.6 5.6 0 0 1 11.2 0" fill={f} stroke={s} strokeWidth="1.4" />
      <rect x="2.6" y="14.4" width="18.8" height="3.4" rx="1.7" fill={f} stroke={s} strokeWidth="1.4" />
      <circle cx="12" cy="7.6" r="1.6" fill={f} stroke={s} strokeWidth="1.3" />
    </>
  ),
  socks: ([f, s]) => (
    <path
      d="M8 3h5.4v8.2c0 1.4.5 2 1.6 2.8l2 1.4a3.3 3.3 0 0 1-3.7 5.4l-2.5-1.6c-1.9-1.3-2.8-2.9-2.8-5.4z"
      fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  trousers: ([f, s]) => (
    <>
      <path d="M6.4 3h11.2l.9 18h-4.3L12 11.4 9.8 21H5.5z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.4 7h11.2" stroke={s} strokeWidth="1.2" />
    </>
  ),
  jacket: ([f, s]) => (
    <>
      <path d="M9 3 4.4 5.6 3 11l2.8.8V21h12.4v-9.2l2.8-.8L19.6 5.6 15 3l-3 3.4Z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 6.4V21" stroke={s} strokeWidth="1.3" />
    </>
  ),
  toy: ([f, s]) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M12 3.6v16.8M3.6 12h16.8" stroke={s} strokeWidth="1.3" />
    </>
  ),
  baby: ([f, s]) => (
    <>
      <circle cx="12" cy="11.6" r="8" fill={f} stroke={s} strokeWidth="1.4" />
      <circle cx="9.3" cy="10.4" r="0.95" fill={s} />
      <circle cx="14.7" cy="10.4" r="0.95" fill={s} />
      <path d="M9.4 14.6a3.6 3.6 0 0 0 5.2 0" stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  bag: ([f, s]) => (
    <>
      <path d="M4.6 8h14.8l1.1 11a2 2 0 0 1-2 2.2H5.5a2 2 0 0 1-2-2.2z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.6 8V6.4a3.4 3.4 0 0 1 6.8 0V8" stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  gift: ([f, s]) => (
    <>
      <rect x="3.4" y="9.6" width="17.2" height="11.4" rx="1.8" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M2.6 6.4h18.8v3.2H2.6zM12 6.4V21" stroke={s} strokeWidth="1.4" fill="none" />
      <path d="M12 6.4C10 6.4 8 5.6 8 4.4S10 2.6 12 6.4Zm0 0c2 0 4-.8 4-2s-2-1.8-4 2Z" fill={f} stroke={s} strokeWidth="1.3" />
    </>
  ),
  info: ([f, s]) => (
    <>
      <circle cx="12" cy="12" r="8.6" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M12 11v5.4" stroke={s} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.9" r="1.05" fill={s} />
    </>
  ),
  mail: ([f, s]) => (
    <>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.4" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="m3.6 7.4 8.4 6 8.4-6" stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  help: ([f, s]) => (
    <>
      <circle cx="12" cy="12" r="8.6" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M9.7 9.5a2.4 2.4 0 1 1 3.2 2.3c-.6.3-.9.8-.9 1.5v.5" stroke={s} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="1.05" fill={s} />
    </>
  ),
  truck: ([f, s]) => (
    <>
      <rect x="1.8" y="6.6" width="12" height="9.6" rx="1.6" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M13.8 9.8h3.9l3.5 3.4v3h-7.4z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="6.6" cy="18.2" r="2" fill="#fff" stroke={s} strokeWidth="1.4" />
      <circle cx="17.4" cy="18.2" r="2" fill="#fff" stroke={s} strokeWidth="1.4" />
    </>
  ),
  box: ([f, s]) => (
    <>
      <path d="M12 2.9 20.6 7v10L12 21.1 3.4 17V7z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3.4 7 12 11.2 20.6 7M12 11.2v9.9" stroke={s} strokeWidth="1.3" fill="none" />
    </>
  ),
  login: ([f, s]) => (
    <>
      <path d="M13.4 3.4h4.8a2 2 0 0 1 2 2v13.2a2 2 0 0 1-2 2h-4.8" fill={f} stroke={s} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.6 8.2 13.4 12l-3.8 3.8M13.4 12H3.8" stroke={s} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  logout: ([f, s]) => (
    <>
      <path d="M10.6 3.4H5.8a2 2 0 0 0-2 2v13.2a2 2 0 0 0 2 2h4.8" fill={f} stroke={s} strokeWidth="1.4" strokeLinecap="round" />
      <path d="m16.4 8.2 3.8 3.8-3.8 3.8M20.2 12h-9.6" stroke={s} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  shield: ([f, s]) => (
    <>
      <path d="M12 2.8 20 6v6c0 4.6-3.3 7.7-8 9.2-4.7-1.5-8-4.6-8-9.2V6z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m8.6 11.9 2.4 2.4 4.4-4.4" stroke={s} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  register: ([f, s]) => (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" fill={f} stroke={s} strokeWidth="1.4" />
      <path d="M2.8 9.4h18.4" stroke={s} strokeWidth="1.4" />
      <path d="M6.6 13.6h5.2" stroke={s} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  sparkle: ([f, s]) => (
    <path
      d="M12 2.6 14 9l6.4 2-6.4 2-2 6.4-2-6.4L3.6 11 10 9z"
      fill={f} stroke={s} strokeWidth="1.3" strokeLinejoin="round"
    />
  ),
};

/** Which palette each icon wears by default. */
const TINT: Record<KidsIconName, Pair> = {
  home: P.rose, shop: P.sky, basket: P.sun, heart: P.pink, user: P.grape,
  shirt: P.sky, dress: P.pink, shoes: P.sand, hat: P.sun, socks: P.mint,
  trousers: P.grape, jacket: P.sky, toy: P.mint, baby: P.pink, bag: P.sand, gift: P.rose,
  info: P.sky, mail: P.grape, help: P.sun, truck: P.mint, box: P.sand,
  login: P.mint, logout: P.rose, shield: P.grape, register: P.sky, sparkle: P.sun,
};

export interface KidsIconProps {
  name: KidsIconName;
  className?: string;
  /** Override the default tint, e.g. to match a section's accent. */
  tint?: keyof typeof P;
  /** Accessible name. Omit when a visible label sits beside the icon. */
  title?: string;
}

export const KidsIcon: React.FC<KidsIconProps> = ({ name, className = 'w-6 h-6', tint, title }) => {
  const draw = ICONS[name];
  if (!draw) return null;
  const colours = (tint ? P[tint] : TINT[name]) as Pair;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {draw(colours)}
    </svg>
  );
};

/**
 * Best-effort mapping from a category's stored icon name (or its own name) to
 * one of the drawn icons. Anything unrecognised returns null so the caller can
 * fall back rather than showing the wrong garment.
 */
export function kidsIconForCategory(raw?: string): KidsIconName | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();

  const match: [KidsIconName, string[]][] = [
    ['shoes', ['shoe', 'foot', 'sneaker', 'boot', 'حذاء', 'أحذية', 'پێڵاو', 'pilaw']],
    ['socks', ['sock', 'جورب', 'گۆرەوی', 'gorawi']],
    ['hat', ['hat', 'cap', 'crown', 'قبعة', 'کڵاو', 'klaw']],
    ['dress', ['dress', 'skirt', 'frock', 'girl', 'فستان', 'تنورة', 'بنات', 'کراس', 'کچ', 'kras']],
    ['jacket', ['jacket', 'coat', 'hoodie', 'معطف', 'جاكيت', 'چاکەت', 'کۆت', 'chaket']],
    ['trousers', ['trouser', 'pant', 'jean', 'short', 'بنطال', 'جينز', 'پانتۆڵ', 'جین']],
    ['shirt', ['shirt', 'tshirt', 't-shirt', 'polo', 'top', 'blouse', 'cloth', 'boy', 'قميص', 'ملابس', 'أولاد', 'تیشێرت', 'پۆشاک', 'کوڕ']],
    ['baby', ['baby', 'newborn', 'infant', 'طفل', 'رضيع', 'ساوا', 'نۆزاد', 'mndal']],
    ['toy', ['toy', 'game', 'play', 'car', 'لعبة', 'ألعاب', 'یاری', 'بازی', 'yari']],
    ['bag', ['bag', 'backpack', 'حقيبة', 'چانتە', 'chant']],
    ['gift', ['gift', 'accessor', 'هدية', 'إكسسوار', 'دیاری', 'پێداویستی']],
  ];

  for (const [icon, keys] of match) {
    if (keys.some(k => n.includes(k))) return icon;
  }
  return null;
}
