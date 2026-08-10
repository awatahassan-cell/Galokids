const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf8');

const target1 = `  const { cart, removeFromCart, updateCartItemQuantity, clearCart } = useStore();`;
const replacement1 = `  const { cart, removeFromCart, updateCartItemQuantity, clearCart, coupons, appliedCoupon, setAppliedCoupon } = useStore();
  const [couponCode, setCouponCode] = React.useState('');
  const [couponError, setCouponError] = React.useState('');`;

content = content.replace(target1, replacement1);

const target2 = `  const totalAmount = cart.reduce((acc, item) => acc + Number(item.product.price || 0) * item.quantity, 0);`;
const replacement2 = `  const subtotal = cart.reduce((acc, item) => acc + Number(item.product.discountPrice || item.product.price || 0) * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const totalAmount = subtotal - discountAmount;
  
  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) {
      setAppliedCoupon(null);
      return;
    }
    const found = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.isActive);
    if (found) {
      setAppliedCoupon(found);
      setCouponCode('');
    } else {
      setCouponError('Invalid or expired coupon code');
    }
  };`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
