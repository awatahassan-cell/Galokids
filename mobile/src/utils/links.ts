import { WEB_BASE_URL } from '../api/client';

/**
 * Turning a website link into a screen in the app.
 *
 * The shop puts links everywhere — on a banner set in the admin panel, in a
 * campaign message, in a WhatsApp broadcast about a discount. They are
 * written as website URLs because that is what people share. When one of them
 * reaches the app, it has to land on the matching screen rather than dumping
 * the customer on the home page and asking them to find the offer again.
 *
 * The same function serves both directions: a `link` field stored on a banner,
 * and a URL the operating system hands us because the customer tapped a
 * galokids.com link somewhere else on the phone.
 *
 * Anything that is not one of the shop's own paths returns null, and the
 * caller ignores it. That matters: a link is untrusted input, and following an
 * arbitrary one into `router.push` is how an app ends up navigating wherever a
 * message tells it to.
 */

/** The paths the app knows, in the order they are matched. */
const ROUTES: { pattern: RegExp; build: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^\/?product\/([^/?#]+)/i, build: m => `/product/${encodeURIComponent(decodeURIComponent(m[1]))}` },
  { pattern: /^\/?products\/?$/i, build: () => '/shop' },
  { pattern: /^\/?shop\/?$/i, build: () => '/shop' },
  { pattern: /^\/?cart\/?$/i, build: () => '/cart' },
  { pattern: /^\/?checkout\/?$/i, build: () => '/checkout' },
  { pattern: /^\/?wishlist\/?$/i, build: () => '/wishlist' },
  { pattern: /^\/?my-orders\/?$/i, build: () => '/orders' },
  { pattern: /^\/?orders?\/([^/?#]+)/i, build: m => `/order/${encodeURIComponent(decodeURIComponent(m[1]))}` },
  { pattern: /^\/?profile\/?$/i, build: () => '/account' },
  { pattern: /^\/?track\/?$/i, build: () => '/track' },
  { pattern: /^\/?about\/?$/i, build: () => '/info/about' },
  { pattern: /^\/?contact\/?$/i, build: () => '/info/contact' },
  { pattern: /^\/?faq\/?$/i, build: () => '/info/faq' },
  { pattern: /^\/?shipping-returns\/?$/i, build: () => '/info/shipping' },
  { pattern: /^\/?size-guide\/?$/i, build: () => '/info/size-guide' },
  { pattern: /^\/?$/, build: () => '/' },
];

/**
 * Screens the app does not have, and must not pretend to.
 *
 * The website's admin panel and till are deliberately absent from this app. A
 * link to one of them opens in the browser rather than resolving to nothing.
 */
const WEB_ONLY = /^\/?(admin|pos)(\/|$)/i;

export interface ResolvedLink {
  /** A path inside the app, when the link points at a screen it has. */
  path: string | null;
  /** True when the link belongs to the shop but only the website serves it. */
  webOnly: boolean;
}

function pathAndQueryOf(raw: string): { path: string; query: URLSearchParams } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // A bare path, as stored on a banner: "/products?category=3".
  if (trimmed.startsWith('/')) {
    const [path, search = ''] = trimmed.split('?');
    return { path, query: new URLSearchParams(search.split('#')[0]) };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // The app's own scheme, and the shop's website. Nothing else: a link to
  // another site is not something to navigate to inside the shop.
  const isOwnScheme = url.protocol === 'galokids:';
  const webHost = (() => {
    try {
      return new URL(WEB_BASE_URL).host.replace(/^www\./, '');
    } catch {
      return 'galokids.com';
    }
  })();
  const isOwnSite = /^https?:$/.test(url.protocol) && url.host.replace(/^www\./, '') === webHost;

  if (!isOwnScheme && !isOwnSite) return null;

  // galokids://product/12 puts "product" in the host, not the path.
  const path = isOwnScheme ? `/${url.host}${url.pathname}`.replace(/\/+$/, '') || '/' : url.pathname;

  return { path, query: url.searchParams };
}

export function resolveLink(raw?: string | null): ResolvedLink {
  if (!raw) return { path: null, webOnly: false };

  const parsed = pathAndQueryOf(raw);
  if (!parsed) return { path: null, webOnly: false };

  if (WEB_ONLY.test(parsed.path)) return { path: null, webOnly: true };

  for (const route of ROUTES) {
    const match = parsed.path.match(route.pattern);
    if (!match) continue;

    let path = route.build(match);

    // Carry the catalogue's own filters through, so a link to a discounted
    // category opens that category already filtered.
    if (path === '/shop') {
      const passthrough = new URLSearchParams();
      const category = parsed.query.get('category') ?? parsed.query.get('category_id');
      const search = parsed.query.get('search') ?? parsed.query.get('q');
      const gender = parsed.query.get('gender');
      const sale = parsed.query.get('sale') ?? parsed.query.get('discount');

      if (category) passthrough.set('category', category);
      if (search) passthrough.set('search', search);
      if (gender) passthrough.set('gender', gender);
      if (sale) passthrough.set('sale', '1');

      const qs = passthrough.toString();
      if (qs) path = `${path}?${qs}`;
    }

    return { path, webOnly: false };
  }

  return { path: null, webOnly: false };
}

/** Just the path, for callers that only navigate. */
export function resolveAppPath(raw?: string | null): string | null {
  return resolveLink(raw).path;
}

/** The website address for a screen, for sharing out of the app. */
export function webUrlForProduct(productId: string): string {
  return `${WEB_BASE_URL}/product/${encodeURIComponent(productId)}`;
}
