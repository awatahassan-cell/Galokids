const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const target1 = `  const { cart, clearCart, addOrder, currentUser } = useStore();`;
const replacement1 = `  const { cart, clearCart, addOrder, currentUser, appliedCoupon, setAppliedCoupon } = useStore();`;
content = content.replace(target1, replacement1);

const target2 = `  const totalAmount = cart.reduce((acc, item) => acc + Number(item.product.price || 0) * item.quantity, 0);`;
const replacement2 = `  const subtotal = cart.reduce((acc, item) => acc + Number(item.product.discountPrice || item.product.price || 0) * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercentage / 100)) : 0;
  const totalAmount = subtotal - discountAmount;`;
content = content.replace(target2, replacement2);

const target3 = `            addOrder({`;
const replacement3 = `            addOrder({
        appliedCoupon: appliedCoupon,
        discountAmount: discountAmount,`;
// Just in case we want to store it, but wait, `Order` type doesn't have `appliedCoupon`. Let's just pass `totalAmount`.
// So we don't need replacement3 if we just rely on `totalAmount`.
fs.writeFileSync('src/pages/Checkout.tsx', content);
