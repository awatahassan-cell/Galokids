import { apiFetch } from '../config/api';
import type { Look, LookSlot, Product } from '../types';

/**
 * The "Try the Look" API.
 *
 * The server answers in snake_case and the rest of the site reads camelCase,
 * so keys are converted on the way in; a look's products come with their
 * variations, which is what lets the page offer real colours and sizes.
 */

const camel = (value: any): any => {
  if (Array.isArray(value)) return value.map(camel);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()), camel(inner)])
    );
  }
  return value;
};

const asString = (value: unknown) => (value == null ? '' : String(value));

/** Ids are numbers on the server and strings everywhere on the site. */
const toLook = (raw: any): Look => {
  const look = camel(raw);

  return {
    ...look,
    id: asString(look.id),
    gender: Number(look.gender ?? 0) as Look['gender'],
    items: (look.items ?? [])
      .filter((item: any) => item.product)
      .map((item: any) => ({
        ...item,
        id: asString(item.id),
        productId: asString(item.productId),
        product: {
          ...item.product,
          id: asString(item.product.id),
          categoryId: asString(item.product.categoryId),
          variations: (item.product.variations ?? []).map((v: any) => ({
            ...v,
            id: asString(v.id),
            productId: asString(v.productId),
            stockQuantity: Number(v.stockQuantity ?? 0),
          })),
        } as Product,
      })),
  };
};

async function readError(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  const first = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;
  throw new Error(first || body?.message || `Request failed (${response.status})`);
}

/** The looks a shopper sees; staff can ask for every one, switched-off included. */
export async function fetchLooks(all = false): Promise<Look[]> {
  const response = await apiFetch(`/looks${all ? '?all=1' : ''}`);
  if (!response.ok) await readError(response);

  return ((await response.json()) as any[]).map(toLook);
}

export interface LookDraft {
  title: string;
  titleKu: string;
  titleAr: string;
  subtitle: string;
  subtitleKu: string;
  subtitleAr: string;
  gender: 0 | 1 | 2;
  ageRange: string;
  accentColor: string;
  imageUrl: string;
  isActive: boolean;
  items: { productId: string; slot: LookSlot; hotspotX: number; hotspotY: number }[];
}

const toBody = (draft: LookDraft) => ({
  title: draft.title,
  title_ku: draft.titleKu || null,
  title_ar: draft.titleAr || null,
  subtitle: draft.subtitle || null,
  subtitle_ku: draft.subtitleKu || null,
  subtitle_ar: draft.subtitleAr || null,
  gender: draft.gender,
  age_range: draft.ageRange || null,
  accent_color: draft.accentColor,
  image_url: draft.imageUrl,
  is_active: draft.isActive,
  items: draft.items.map(item => ({
    product_id: Number(item.productId),
    slot: item.slot,
    hotspot_x: Math.round(item.hotspotX * 10) / 10,
    hotspot_y: Math.round(item.hotspotY * 10) / 10,
  })),
});

export async function saveLook(draft: LookDraft, id?: string): Promise<Look> {
  const response = await apiFetch(id ? `/looks/${id}` : '/looks', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBody(draft)),
  });
  if (!response.ok) await readError(response);

  return toLook(await response.json());
}

export async function deleteLook(id: string): Promise<void> {
  const response = await apiFetch(`/looks/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) await readError(response);
}

export async function reorderLooks(ids: string[]): Promise<void> {
  const response = await apiFetch('/looks/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids.map(Number) }),
  });
  if (!response.ok) await readError(response);
}

/** Search the catalogue for the admin's piece picker. */
export async function searchProducts(term: string): Promise<Product[]> {
  const response = await apiFetch(`/products?light=1&limit=15&page=1&search=${encodeURIComponent(term)}`);
  if (!response.ok) await readError(response);
  const json = await response.json();
  const rows: any[] = Array.isArray(json) ? json : (json.data ?? []);

  return rows.map(row => {
    const product = camel(row);
    return { ...product, id: asString(product.id), categoryId: asString(product.categoryId), variations: product.variations ?? [] } as Product;
  });
}
