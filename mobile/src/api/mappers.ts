import type {
  Category,
  HeroSlide,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductVariation,
  PromoBanner,
  Review,
  StoreSettings,
  User,
} from './types';

/**
 * Turning what Laravel sends into what the app expects.
 *
 * Written out field by field rather than run through a generic snake-to-camel
 * converter. A converter is shorter but it also passes through everything the
 * API happens to include — costs, supplier names, whatever a future endpoint
 * adds — and quietly hands it to the screen. Naming the fields keeps the app
 * holding only what a shopper's phone has any business holding.
 */

const str = (value: unknown, fallback = ''): string =>
  value === null || value === undefined ? fallback : String(value);

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const maybeNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type Raw = Record<string, any>;

export function toCategory(raw: Raw): Category {
  return {
    id: str(raw.id),
    name: str(raw.name),
    nameKu: raw.name_ku ?? undefined,
    nameAr: raw.name_ar ?? undefined,
    slug: raw.slug ?? undefined,
    icon: raw.icon ?? undefined,
    productsCount: raw.products_count != null ? num(raw.products_count) : undefined,
  };
}

export function toVariation(raw: Raw): ProductVariation {
  return {
    id: str(raw.id),
    productId: str(raw.product_id),
    color: str(raw.color),
    size: str(raw.size),
    stockQuantity: num(raw.stock_quantity),
    priceOverride: maybeNum(raw.price_override),
    barcode: raw.barcode ?? undefined,
    sku: raw.sku ?? undefined,
  };
}

export function toReview(raw: Raw): Review {
  return {
    id: str(raw.id),
    productId: str(raw.product_id),
    author: str(raw.author, 'Anonymous'),
    rating: num(raw.rating, 5),
    comment: str(raw.comment),
    date: str(raw.date ?? raw.created_at),
    imageUrl: raw.image_url ?? undefined,
    verifiedPurchase: Boolean(raw.verified_purchase),
  };
}

export function toProduct(raw: Raw): Product {
  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean).map(String) : [];
  const primary = str(raw.image_url) || images[0] || '';

  return {
    id: str(raw.id),
    categoryId: str(raw.category_id),
    categoryName: raw.category?.name ? str(raw.category.name) : undefined,
    name: str(raw.name),
    nameKu: raw.name_ku ?? undefined,
    nameAr: raw.name_ar ?? undefined,
    description: str(raw.description),
    descriptionKu: raw.description_ku ?? undefined,
    descriptionAr: raw.description_ar ?? undefined,
    imageUrl: primary,
    // The main image belongs in the gallery too, and only once.
    images: primary && !images.includes(primary) ? [primary, ...images] : images,
    price: num(raw.price),
    discountPrice: maybeNum(raw.discount_price),
    gender: (num(raw.gender) as 0 | 1 | 2) ?? 0,
    variations: Array.isArray(raw.variations) ? raw.variations.map(toVariation) : [],
    reviews: Array.isArray(raw.reviews) ? raw.reviews.map(toReview) : [],
    createdAt: raw.created_at ?? undefined,
  };
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

function toOrderItem(raw: Raw): OrderItem {
  return {
    id: str(raw.id),
    productId: raw.product_id != null ? str(raw.product_id) : undefined,
    productVariationId: raw.product_variation_id != null ? str(raw.product_variation_id) : undefined,
    // The line's own recorded name, not the catalogue's: a receipt must not
    // change when a product is renamed or removed.
    name: str(raw.product_name ?? raw.name, 'Item'),
    color: raw.variation_label ? str(raw.variation_label).split('/')[0]?.trim() : undefined,
    size: raw.variation_label ? str(raw.variation_label).split('/')[1]?.trim() : undefined,
    quantity: num(raw.quantity, 1),
    unitPrice: num(raw.price ?? raw.unit_price),
    imageUrl: raw.product?.image_url ?? undefined,
    returnedQuantity: num(raw.returned_quantity),
  };
}

export function toOrder(raw: Raw): Order {
  const items = Array.isArray(raw.items) ? raw.items.map(toOrderItem) : [];
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedQuantity = items.reduce((sum, item) => sum + (item.returnedQuantity ?? 0), 0);
  const status = str(raw.status, 'pending').toLowerCase();

  return {
    id: str(raw.id),
    invoiceNo: raw.invoice_no ?? undefined,
    status: (ORDER_STATUSES.includes(status as OrderStatus) ? status : 'pending') as OrderStatus,
    date: str(raw.created_at ?? raw.date),
    customerName: str(raw.customer_name),
    customerPhone: raw.customer_phone ?? undefined,
    shippingAddress: str(raw.shipping_address),
    governorate: raw.governorate ?? undefined,
    items,
    subtotal: num(raw.subtotal),
    deliveryFee: num(raw.shipping_fee),
    discountAmount: num(raw.discount_amount),
    totalAmount: num(raw.total_amount),
    paymentMethod: raw.payment_method ?? undefined,
    returnedQuantity,
    totalQuantity,
    fullyReturned: totalQuantity > 0 && returnedQuantity >= totalQuantity,
  };
}

export function toUser(raw: Raw): User {
  return {
    id: str(raw.id),
    name: str(raw.name),
    // The API writes a placeholder address for phone-only sign-ups; showing
    // it back to the customer as their email would be nonsense.
    email: raw.email && !String(raw.email).includes('@phone.user') ? str(raw.email) : undefined,
    phone: raw.phone ?? undefined,
    address: raw.address ?? undefined,
    role: num(raw.role),
    joinDate: raw.created_at ?? undefined,
  };
}

function toHeroSlide(raw: Raw): HeroSlide {
  return {
    id: raw.id != null ? str(raw.id) : undefined,
    badgeKu: raw.badgeKu ?? raw.badge_ku ?? undefined,
    badgeAr: raw.badgeAr ?? raw.badge_ar ?? undefined,
    badgeEn: raw.badgeEn ?? raw.badge_en ?? undefined,
    titleKu: raw.titleKu ?? raw.title_ku ?? undefined,
    titleAr: raw.titleAr ?? raw.title_ar ?? undefined,
    titleEn: raw.titleEn ?? raw.title_en ?? undefined,
    subtitleKu: raw.subtitleKu ?? raw.subtitle_ku ?? undefined,
    subtitleAr: raw.subtitleAr ?? raw.subtitle_ar ?? undefined,
    subtitleEn: raw.subtitleEn ?? raw.subtitle_en ?? undefined,
    ctaKu: raw.ctaKu ?? raw.cta_ku ?? undefined,
    ctaAr: raw.ctaAr ?? raw.cta_ar ?? undefined,
    ctaEn: raw.ctaEn ?? raw.cta_en ?? undefined,
    imageUrl: raw.imageUrl ?? raw.image_url ?? undefined,
    link: raw.link ?? undefined,
  };
}

/** Settings values arrive as strings when they were typed into a text field. */
function parseMaybeJson(value: unknown): any {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function toStoreSettings(raw: Raw): StoreSettings {
  const heroSlidesRaw = parseMaybeJson(raw.hero_slides);
  const promoRaw = parseMaybeJson(raw.promo_banner);
  const ratesRaw = parseMaybeJson(raw.shipping_rates);

  const rates: Record<string, number> = {};
  if (ratesRaw && typeof ratesRaw === 'object' && !Array.isArray(ratesRaw)) {
    Object.entries(ratesRaw as Record<string, unknown>).forEach(([key, value]) => {
      const fee = maybeNum(value);
      if (fee !== null) rates[key] = fee;
    });
  }

  let promoBanner: PromoBanner | undefined;
  if (promoRaw && typeof promoRaw === 'object') {
    const p = promoRaw as Raw;
    promoBanner = {
      imageUrl: p.imageUrl ?? p.image_url ?? undefined,
      titleEn: p.titleEn ?? undefined,
      titleKu: p.titleKu ?? undefined,
      titleAr: p.titleAr ?? undefined,
      subtitleEn: p.subtitleEn ?? undefined,
      subtitleKu: p.subtitleKu ?? undefined,
      subtitleAr: p.subtitleAr ?? undefined,
      isActive: p.isActive !== false,
      endDate: p.endDate ?? undefined,
      link: p.link ?? undefined,
      slides: Array.isArray(p.slides) ? p.slides.map(toHeroSlide) : undefined,
    };
  }

  return {
    storeName: raw.store_name ?? undefined,
    storeLogo: raw.store_logo ?? undefined,
    storePhone: raw.store_phone ?? undefined,
    storeAddress: raw.store_address ?? undefined,
    contactEmail: raw.contact_email ?? undefined,
    whatsappNumber: raw.whatsapp_number ?? undefined,
    facebookUrl: raw.facebook_url ?? undefined,
    instagramUrl: raw.instagram_url ?? undefined,
    tiktokUrl: raw.tiktok_url ?? undefined,
    snapchatUrl: raw.snapchat_url ?? undefined,
    shippingDefaultFee: maybeNum(raw.shipping_default_fee) ?? undefined,
    shippingFreeOver: maybeNum(raw.shipping_free_over) ?? undefined,
    shippingRates: Object.keys(rates).length ? rates : undefined,
    heroSlides: Array.isArray(heroSlidesRaw) ? heroSlidesRaw.map(toHeroSlide) : undefined,
    promoBanner,
    instagramConfigured: raw.instagram_access_token_set === true,
  };
}
