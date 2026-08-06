const fs = require('fs');

let content = fs.readFileSync('src/store.tsx', 'utf8');

const importReplacement = `import { Category, Product, CartItem, ProductVariation, Review, User, Order, Expense, PromoBanner, PaginationMeta, Coupon } from './types';`;
content = content.replace(/import { Category[\s\S]*?from '\.\/types';/, importReplacement);

const typeAdditions = `
  promoBanner: PromoBanner;
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  setAppliedCoupon: (coupon: Coupon | null) => void;
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (coupon: Coupon) => void;
  deleteCoupon: (id: string) => void;
`;
content = content.replace(/promoBanner: PromoBanner;/, typeAdditions);

const stateAdditions = `
  const [promoBanner, setPromoBanner] = useState<PromoBanner>(() => {
    const saved = localStorage.getItem('promoBanner');
    return saved ? JSON.parse(saved) : { imageUrl: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80', titleEn: 'SUMMER SALE', titleKu: 'داشکاندنی هاوینە', titleAr: 'تخفيضات الصيف', subtitleEn: 'Up to 50% off on all items', subtitleKu: 'داشکاندن تا ٥٠٪ لەسەر هەموو کاڵاکان', subtitleAr: 'خصم يصل إلى ٥٠٪ على جميع العناصر', isActive: true };
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('coupons');
    return saved ? JSON.parse(saved) : [{ id: '1', code: 'SUMMER20', discountPercentage: 20, isActive: true }];
  });
  
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    const saved = localStorage.getItem('appliedCoupon');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('appliedCoupon');
    }
  }, [appliedCoupon]);

  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => [...prev, coupon]);
  };
  
  const updateCoupon = (updatedCoupon: Coupon) => {
    setCoupons(prev => prev.map(c => c.id === updatedCoupon.id ? updatedCoupon : c));
  };
  
  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    if (appliedCoupon?.id === id) {
      setAppliedCoupon(null);
    }
  };
`;

content = content.replace(/const \[promoBanner, setPromoBanner\][\s\S]*?isActive: true \};\n  \}\);/, stateAdditions);

const contextValues = `
    promoBanner,
    updatePromoBanner: setPromoBanner,
    coupons,
    appliedCoupon,
    setAppliedCoupon,
    addCoupon,
    updateCoupon,
    deleteCoupon,
`;
content = content.replace(/promoBanner,\n\s*updatePromoBanner: setPromoBanner,/, contextValues);

fs.writeFileSync('src/store.tsx', content);
