const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf8');

const target = `  const { cart, removeFromCart, updateCartItemQuantity } = useStore();`;
const replacement = `  const { cart, removeFromCart, updateCartItemQuantity, coupons, appliedCoupon, setAppliedCoupon } = useStore();
  const [couponCode, setCouponCode] = React.useState('');
  const [couponError, setCouponError] = React.useState('');`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/CartDrawer.tsx', content);
