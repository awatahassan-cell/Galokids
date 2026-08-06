const fs = require('fs');
let content = fs.readFileSync('src/store.tsx', 'utf8');

const newPromoAndCoupons = `
  const [promoBanner, setPromoBanner] = useState<PromoBanner>(() => {
    const saved = localStorage.getItem('promoBanner');
    return saved ? JSON.parse(saved) : { 
      imageUrl: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      titleEn: 'Summer Sale Collection',
      titleKu: 'کۆکراوەی داشکاندنی هاوینە',
      titleAr: 'تشكيلة تخفيضات الصيف',
      subtitleEn: 'Up to 50% off on selected items',
      subtitleKu: 'تا ٪٥٠ داشکاندن بۆ هەندێک کاڵا',
      subtitleAr: 'خصم يصل إلى 50٪ على عناصر محددة',
      isActive: true
    };
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

content = content.replace(/const \[promoBanner, setPromoBanner\] = useState<PromoBanner>\(\{[\s\S]*?isActive: true\n  \}\);/, newPromoAndCoupons);

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
