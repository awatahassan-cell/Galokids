const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `  // Calendar Reports State`;
const replacement = `  // Coupons State
  const [couponCode, setAdminCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponIsActive, setCouponIsActive] = useState(true);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponDiscount) return;
    
    if (editingCouponId) {
      updateCoupon({
        id: editingCouponId,
        code: couponCode,
        discountPercentage: Number(couponDiscount),
        isActive: couponIsActive
      });
      setEditingCouponId(null);
    } else {
      addCoupon({
        id: Math.random().toString(36).substr(2, 9),
        code: couponCode,
        discountPercentage: Number(couponDiscount),
        isActive: couponIsActive
      });
    }
    setAdminCouponCode('');
    setCouponDiscount('');
    setCouponIsActive(true);
  };
  
  const handleEditCoupon = (coupon: any) => {
    setEditingCouponId(coupon.id);
    setAdminCouponCode(coupon.code);
    setCouponDiscount(coupon.discountPercentage.toString());
    setCouponIsActive(coupon.isActive);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calendar Reports State`;

content = content.replace(target, replacement);

fs.writeFileSync('src/pages/Admin.tsx', content);
