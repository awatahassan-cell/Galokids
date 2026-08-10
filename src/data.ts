import { Category, Product, User, Order, Expense } from './types';

export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Tops', nameKu: 'تۆپەکان', nameAr: 'قمصان' },
  { id: 'c2', name: 'Bottoms', nameKu: 'پانتۆڵەکان', nameAr: 'بناطيل' },
  { id: 'c3', name: 'Outerwear', nameKu: 'جلی دەرەوە', nameAr: 'ملابس خارجية' },
  { id: 'c4', name: 'Accessories', nameKu: 'ئێکسسوارات', nameAr: 'إكسسوارات' },
];

function generate1000Products(): Product[] {
  const images = [
    'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1543132220-4bf5292c58a6?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=800',
  ];

  const categories = ['c1', 'c2', 'c3', 'c4'];
  const colors = ['Blue', 'Pink', 'Green', 'Red', 'Yellow', 'Black', 'White', 'Navy'];
  const sizes = ['S', 'M', 'L', 'XL', '2T', '3T', '4T'];

  const productTemplates = [
    { en: 'Casual Kids Tee', ku: 'تیشێرتی کواڵێتی منداڵان', ar: 'تيشيرت أطفال كاجوال' },
    { en: 'Comfortable Jeans', ku: 'پانتۆڵی کابۆی ئاسوودە', ar: 'جينز مريح للأطفال' },
    { en: 'Warm Winter Jacket', ku: 'چاکەتی گەرمی زستانە', ar: 'سترة شتوية دافئة' },
    { en: 'Cute Summer Dress', ku: 'فوستانی ڕەنگینی هاوینە', ar: 'فستان صيفي لطيف' },
    { en: 'Cotton Pyjama Set', ku: 'سێتی پیجامەی لۆکە', ar: 'طقم بيجامة قطني' },
    { en: 'Sporty Hoodie & Joggers', ku: 'سێتی هودی و وەرزشی', ar: 'هودي وبنطال رياضي' },
    { en: 'Soft Wool Sweater', ku: 'سوێتەری خوری نەرم', ar: 'سترة صوفية ناعمة' },
    { en: 'Floral Party Dress', ku: 'فوستانی گوڵداری ئاهەنگ', ar: 'فستان زهور للحفلات' },
    { en: 'Denim Shorts', ku: 'شۆڕتی کابۆی هاوینە', ar: 'شورت جينز صيفي' },
    { en: 'Kids Winter Beanie & Scarf', ku: 'کڵاو و ملپێچی زستانە', ar: 'قبعة ووشاح شتوي' },
  ];

  const list: Product[] = [];
  for (let i = 1; i <= 1000; i++) {
    const tpl = productTemplates[(i - 1) % productTemplates.length];
    const cat = categories[(i - 1) % categories.length];
    const img = images[(i - 1) % images.length];
    const price = Math.round((12 + (i % 35)) * 1000); // 12,000 to 46,000 IQD
    const cost = Math.round(price * 0.55);
    const barcode = `869000${String(i).padStart(6, '0')}`;
    const gender = (i % 3) as 0 | 1 | 2;

    const numVars = 2 + (i % 4);
    const vars = [];
    for (let v = 0; v < numVars; v++) {
      vars.push({
        id: `v_${i}_${v + 1}`,
        productId: `p_${i}`,
        color: colors[(i + v) % colors.length],
        size: sizes[(i + v) % sizes.length],
        stockQuantity: (i * 3 + v * 7) % 45 + 5,
      });
    }

    list.push({
      id: `p_${i}`,
      categoryId: cat,
      name: `${tpl.en} #${i}`,
      nameKu: `${tpl.ku} #${i}`,
      nameAr: `${tpl.ar} #${i}`,
      description: `Premium quality clothing item for children. Comfort guaranteed. Item #${i}`,
      descriptionKu: `پۆشاکی منداڵانی کوالیتی بەرز و دڵنیا لە ئاسوودەیی. بەرهەمی ژمارە #${i}`,
      descriptionAr: `ملابس أطفال عالية الجودة ومريحة للغاية. المنتج رقم #${i}`,
      sku: `SKU-GALO-${String(i).padStart(4, '0')}`,
      barcode: barcode,
      imageUrl: img,
      price: price,
      cost: cost,
      gender: gender,
      variations: vars,
    });
  }

  return list;
}

export const MOCK_PRODUCTS: Product[] = generate1000Products();

export const COLORS = Array.from(new Set(MOCK_PRODUCTS.flatMap(p => p.variations.map(v => v.color))));
export const SIZES = Array.from(new Set(MOCK_PRODUCTS.flatMap(p => p.variations.map(v => v.size))));

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Awat Hassan', email: 'admin@galokids.com', role: 1, joinDate: '2023-01-15' },
  { id: 'u4', name: 'Saman Mahmood', email: 'cashier@galokids.com', role: 2, joinDate: '2023-06-10' },
  { id: 'u2', name: 'John Doe', email: 'john@example.com', role: 0, joinDate: '2023-05-20' },
  { id: 'u3', name: 'Jane Smith', email: 'jane@example.com', role: 0, joinDate: '2023-08-11' },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_1',
    userId: 'u2',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    items: [],
    totalAmount: 45980,
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
    totalAmount: 29990,
    status: 'processing',
    date: '2023-10-25',
    shippingAddress: '456 Oak Ave, CA',
  }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Monthly Hosting', amount: 50000, category: 'Infrastructure', date: '2023-10-01' },
  { id: 'e2', description: 'Inventory Restock', amount: 1200000, category: 'Inventory', date: '2023-10-15' },
  { id: 'e3', description: 'Marketing Ads', amount: 300000, category: 'Marketing', date: '2023-10-20' },
];

export const STANDARD_COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Pink', 'Purple', 'Orange', 'Gray', 'Brown', 'Navy', 'Beige'];
export const STANDARD_SIZES = ['Newborn', '0-3M', '3-6M', '6-12M', '12-18M', '18-24M', '2T', '3T', '4T', '5T', 'XS', 'S', 'M', 'L', 'XL'];
