/**
 * The shapes the shop's API deals in, in the app's own words.
 *
 * The API answers in snake_case; everything past `mappers.ts` uses these.
 * They mirror the website's `types.ts` deliberately — a screen ported from
 * the web should not have to relearn what a product is called.
 */

export interface Category {
  id: string;
  name: string;
  nameKu?: string;
  nameAr?: string;
  slug?: string;
  icon?: string;
  productsCount?: number;
}

export interface ProductVariation {
  id: string;
  productId: string;
  color: string;
  size: string;
  stockQuantity: number;
  priceOverride?: number | null;
  barcode?: string;
  sku?: string;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  imageUrl?: string;
  verifiedPurchase?: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  nameKu?: string;
  nameAr?: string;
  description: string;
  descriptionKu?: string;
  descriptionAr?: string;
  imageUrl: string;
  images: string[];
  price: number;
  discountPrice?: number | null;
  gender?: 0 | 1 | 2;
  variations: ProductVariation[];
  reviews: Review[];
  createdAt?: string;
}

export interface CartLine {
  /** Stable key for the line: product and variation together. */
  id: string;
  product: Product;
  variation: ProductVariation | null;
  quantity: number;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  id: string;
  productId?: string;
  productVariationId?: string;
  name: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  returnedQuantity?: number;
}

export interface Order {
  id: string;
  invoiceNo?: string;
  status: OrderStatus;
  date: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: string;
  governorate?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  returnedQuantity?: number;
  totalQuantity?: number;
  fullyReturned?: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  /** 0 customer, 1 admin, 2 cashier, 3 staff. The app only serves 0. */
  role: number;
  joinDate?: string;
}

export interface HeroSlide {
  id?: string;
  badgeKu?: string;
  badgeAr?: string;
  badgeEn?: string;
  titleKu?: string;
  titleAr?: string;
  titleEn?: string;
  subtitleKu?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  ctaKu?: string;
  ctaAr?: string;
  ctaEn?: string;
  imageUrl?: string;
  link?: string;
}

export interface PromoBanner {
  imageUrl?: string;
  titleEn?: string;
  titleKu?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleKu?: string;
  subtitleAr?: string;
  isActive?: boolean;
  endDate?: string;
  link?: string;
  slides?: HeroSlide[];
}

export interface StoreSettings {
  storeName?: string;
  storeLogo?: string;
  storePhone?: string;
  storeAddress?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  snapchatUrl?: string;
  shippingDefaultFee?: number;
  shippingFreeOver?: number;
  shippingRates?: Record<string, number>;
  heroSlides?: HeroSlide[];
  promoBanner?: PromoBanner;
  instagramConfigured?: boolean;
}

export interface Paginated<T> {
  data: T[];
  currentPage: number;
  lastPage: number;
  total: number;
}

export interface CouponResult {
  valid: boolean;
  code?: string;
  discountPercentage?: number;
  message?: string;
}

export interface ShippingQuote {
  fee: number;
  freeOver: number;
  defaultFee: number;
}
