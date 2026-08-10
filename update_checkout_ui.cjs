const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const target = `            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <p>{t('subtotal')}</p>
                <p>{totalAmount.toFixed(2)}</p>
              </div>`;
const replacement = `            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <p>{t('subtotal')}</p>
                <p>{subtotal.toFixed(2)}</p>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                  <p>Discount ({appliedCoupon.discountPercentage}%)</p>
                  <p>-{discountAmount.toFixed(2)}</p>
                </div>
              )}`;
content = content.replace(target, replacement);

// We should also clear appliedCoupon on successful checkout
const targetSuccess = `      clearCart();`;
const replacementSuccess = `      clearCart();
      setAppliedCoupon(null);`;
content = content.replace(targetSuccess, replacementSuccess);

fs.writeFileSync('src/pages/Checkout.tsx', content);
