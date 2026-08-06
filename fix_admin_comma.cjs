const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `    refreshProducts, refreshOrders, refreshExpenses, refreshReviews
    coupons, addCoupon, updateCoupon, deleteCoupon`;
const replacement = `    refreshProducts, refreshOrders, refreshExpenses, refreshReviews,
    coupons, addCoupon, updateCoupon, deleteCoupon`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Admin.tsx', content);
