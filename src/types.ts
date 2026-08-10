export interface Category {
  id: string;
  name: string;
  nameKu?: string;
  nameAr?: string;
  slug?: string;
  icon?: string;
}

export interface ProductVariation {
  id: string;
  productId: string;
  color: string;
  size: string;
  stockQuantity: number;
  /** Per-variation price. When set it wins over the product price (and its discount). */
  priceOverride?: number | null;
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

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 0 | 1 | 2 | 3 | '0' | '1' | '2' | '3' | 'admin' | 'cashier' | 'staff' | 'customer';
  joinDate: string;
  phone?: string;
  address?: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  shippingAddress: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface PromoSlide {
  id: string;
  badgeKu?: string;
  badgeAr?: string;
  badgeEn?: string;
  titleKu: string;
  titleAr?: string;
  titleEn?: string;
  subtitleKu?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  ctaKu?: string;
  ctaAr?: string;
  ctaEn?: string;
  imageUrl: string;
  link?: string;
}

export interface PromoBanner {
  imageUrl: string;
  titleEn: string;
  titleKu: string;
  titleAr: string;
  subtitleEn: string;
  subtitleKu: string;
  subtitleAr: string;
  isActive: boolean;
  endDate?: string; // ISO datetime for an optional promo countdown
  slides?: PromoSlide[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  nameKu?: string;
  nameAr?: string;
  description: string;
  descriptionKu?: string;
  descriptionAr?: string;
  barcode?: string;
  imageUrl: string;
  images?: string[];
  sku?: string;
  price: number;
  
  cost?: number;
  discountPrice?: number;

  variations: ProductVariation[];
  reviews?: Review[];
  gender?: 0 | 1 | 2;
  createdAt?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variation: ProductVariation;
  quantity: number;
}


export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  total: number;
}


export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number; // 0-100
  isActive: boolean;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface HeroSlide {
  id: string;
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
  cta2Ku?: string;
  cta2Ar?: string;
  cta2En?: string;
  btn1TextKu?: string;
  btn1Link?: string;
  btn2TextKu?: string;
  btn2Link?: string;
  image?: string;
  imageUrl?: string;
  link?: string;
  link2?: string;
  floatingBadgeTitle?: string;
  floatingBadgeTitleKu?: string;
  floatingBadgeTitleAr?: string;
  floatingBadgeDesc?: string;
  floatingBadgeDescKu?: string;
  floatingBadgeDescAr?: string;
  discountTag?: string;
}
