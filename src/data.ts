import { Category, Product, User, Order, Expense } from './types';

export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Tops', nameKu: 'تۆپەکان', nameAr: 'قمصان' },
  { id: 'c2', name: 'Bottoms', nameKu: 'پانتۆڵەکان', nameAr: 'بناطيل' },
  { id: 'c3', name: 'Outerwear', nameKu: 'جلی دەرەوە', nameAr: 'ملابس خارجية' },
  { id: 'c4', name: 'Accessories', nameKu: 'ئێکسسوارات', nameAr: 'إكسسوارات' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    categoryId: 'c1',
    name: 'Dinosaur Graphic Tee',
    nameKu: 'تیشێرتی نەخشی دایناسۆر',
    nameAr: 'تي شيرت بطبعة ديناصور',
    description: 'A fun and comfortable cotton t-shirt with a dinosaur print.',
    descriptionKu: 'تیشێرتێکی لۆکەی ئاسوودە بە نەخشی دایناسۆر.',
    descriptionAr: 'تي شيرت قطني مريح وممتع بطبعة ديناصور.',
    sku: 'TEE-DINO-01',
    imageUrl: 'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800',
    price: 15.99,
    gender: 1,
    cost: 6.50,
    variations: [
      { id: 'v1', productId: 'p1', color: 'Blue', size: 'S', stockQuantity: 10 },
      { id: 'v2', productId: 'p1', color: 'Blue', size: 'M', stockQuantity: 5 },
      { id: 'v3', productId: 'p1', color: 'Blue', size: 'L', stockQuantity: 0 },
      { id: 'v4', productId: 'p1', color: 'Green', size: 'S', stockQuantity: 12 },
    ],
    reviews: [
      { id: 'r1', productId: 'p1', author: 'Jane Doe', rating: 5, comment: 'My son loves this shirt! Great quality.', date: '2023-10-01' },
      { id: 'r2', productId: 'p1', author: 'Mark Smith', rating: 4, comment: 'Nice print, but runs a bit small.', date: '2023-10-15' }
    ]
  },
  {
    id: 'p2',
    categoryId: 'c2',
    name: 'Denim Overalls',
    nameKu: 'شەواڵی کابۆ',
    nameAr: 'سالوبيت جينز',
    description: 'Durable and cute denim overalls for active kids.',
    descriptionKu: 'شەواڵی کابۆی بەهێز و جوان بۆ منداڵانی چالاک.',
    descriptionAr: 'سالوبيت جينز متين ولطيف للأطفال النشطين.',
    sku: 'BTM-OVR-01',
    imageUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800',
    price: 29.99,
    gender: 0,
    cost: 12.00,
    variations: [
      { id: 'v5', productId: 'p2', color: 'Blue', size: 'M', stockQuantity: 8 },
      { id: 'v6', productId: 'p2', color: 'Blue', size: 'L', stockQuantity: 3 },
      { id: 'v7', productId: 'p2', color: 'Blue', size: 'XL', stockQuantity: 0 },
    ],
  },
  {
    id: 'p3',
    categoryId: 'c3',
    name: 'Rainy Day Jacket',
    nameKu: 'چاکەتی ڕۆژی باراناوی',
    nameAr: 'سترة الأيام الممطرة',
    description: 'Water-resistant jacket to keep them dry on rainy days.',
    descriptionKu: 'چاکەتی دژە ئاو بۆ هێشتنەوەیان بە وشکی لە ڕۆژە باراناوییەکاندا.',
    descriptionAr: 'سترة مقاومة للماء لإبقائهم جافين في الأيام الممطرة.',
    sku: 'OUT-RAIN-01',
    imageUrl: 'https://images.unsplash.com/photo-1543132220-4bf5292c58a6?auto=format&fit=crop&q=80&w=800',
    price: 45.00,
    gender: 2,
    cost: 18.50,
    variations: [
      { id: 'v8', productId: 'p3', color: 'Yellow', size: 'S', stockQuantity: 15 },
      { id: 'v9', productId: 'p3', color: 'Yellow', size: 'M', stockQuantity: 10 },
      { id: 'v10', productId: 'p3', color: 'Red', size: 'S', stockQuantity: 2 },
    ],
  },
  {
    id: 'p4',
    categoryId: 'c1',
    name: 'Striped Cotton Sweater',
    nameKu: 'قەمیسی لۆکەی خەتخەت',
    nameAr: 'سترة قطنية مخططة',
    description: 'Warm and cozy sweater for colder days.',
    descriptionKu: 'قەمیسێکی گەرم و ئاسوودە بۆ ڕۆژە ساردەکان.',
    descriptionAr: 'سترة دافئة ومريحة للأيام الباردة.',
    sku: 'TEE-SWT-02',
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=800',
    price: 35.50,
    gender: 0,
    cost: 14.00,
    variations: [
      { id: 'v11', productId: 'p4', color: 'Red', size: 'M', stockQuantity: 5 },
      { id: 'v12', productId: 'p4', color: 'Red', size: 'L', stockQuantity: 5 },
      { id: 'v13', productId: 'p4', color: 'Blue', size: 'M', stockQuantity: 0 },
    ],
  },
  {
    id: 'p5',
    categoryId: 'c4',
    name: 'Cozy Winter Beanie',
    nameKu: 'کڵاوی زستانەی ئاسوودە',
    nameAr: 'قبعة شتوية مريحة',
    description: 'Knitted beanie with a fun pom-pom.',
    descriptionKu: 'کڵاوی چنراو بە پۆم-پۆمێکی خۆش.',
    descriptionAr: 'قبعة محبوكة مع كرة بوم بوم ممتعة.',
    sku: 'ACC-BEAN-01',
    imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=800',
    price: 12.99,
    cost: 4.00,
    variations: [
      { id: 'v14', productId: 'p5', color: 'Pink', size: 'One Size', stockQuantity: 20 },
      { id: 'v15', productId: 'p5', color: 'Blue', size: 'One Size', stockQuantity: 18 },
    ],
  }
];

export const COLORS = Array.from(new Set(MOCK_PRODUCTS.flatMap(p => p.variations.map(v => v.color))));
export const SIZES = Array.from(new Set(MOCK_PRODUCTS.flatMap(p => p.variations.map(v => v.size))));

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@galokids.com', role: 3, joinDate: '2023-01-15' },
  { id: 'u4', name: 'Staff User', email: 'staff@galokids.com', role: 2, joinDate: '2023-06-10' },
  { id: 'u2', name: 'John Doe', email: 'john@example.com', role: 1, joinDate: '2023-05-20' },
  { id: 'u3', name: 'Jane Smith', email: 'jane@example.com', role: 1, joinDate: '2023-08-11' },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_1',
    userId: 'u2',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    items: [],
    totalAmount: 45.98,
    status: 'delivered',
    date: '2023-10-05',
    shippingAddress: '123 Main St, NY',
  },
  {
    id: 'ord_2',
    userId: 'u3',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    items: [],
    totalAmount: 29.99,
    status: 'processing',
    date: '2023-10-25',
    shippingAddress: '456 Oak Ave, CA',
  }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Monthly Hosting', amount: 50, category: 'Infrastructure', date: '2023-10-01' },
  { id: 'e2', description: 'Inventory Restock', amount: 1200, category: 'Inventory', date: '2023-10-15' },
  { id: 'e3', description: 'Marketing Ads', amount: 300, category: 'Marketing', date: '2023-10-20' },
];

export const STANDARD_COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Pink', 'Purple', 'Orange', 'Gray', 'Brown', 'Navy', 'Beige'];
export const STANDARD_SIZES = ['Newborn', '0-3M', '3-6M', '6-12M', '12-18M', '18-24M', '2T', '3T', '4T', '5T', 'XS', 'S', 'M', 'L', 'XL'];
