const fs = require('fs');
let content = fs.readFileSync('src/components/CartDrawer.tsx', 'utf8');

const target1 = `                      <p className="text-sm font-medium text-slate-900">{(Number(item.product.price || 0) * item.quantity).toFixed(2)}</p>`;
const replacement1 = `                      <p className="text-sm font-medium text-slate-900">{(Number(item.product.discountPrice || item.product.price || 0) * item.quantity).toFixed(2)}</p>`;
content = content.replace(target1, replacement1);

const target2 = `        {cart.length > 0 && (
          <div className="border-t border-slate-200 p-6 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-medium text-slate-900">{t('subtotal')}</span>
              <span className="text-lg font-bold text-slate-900">{totalAmount.toFixed(2)}</span>
            </div>`;
const replacement2 = `        {cart.length > 0 && (
          <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-4">
            
            {/* Coupon Section */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Discount code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500">{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm">
                  <span className="font-medium">Coupon '{appliedCoupon.code}' applied</span>
                  <button onClick={() => setAppliedCoupon(null)} className="hover:text-emerald-900 font-bold">&times;</button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-sm text-emerald-600 font-medium">
                  <span>Discount ({appliedCoupon.discountPercentage}%)</span>
                  <span>-{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-lg">
                <span>{t('subtotal') || 'Total'}</span>
                <span>{totalAmount.toFixed(2)}</span>
              </div>
            </div>`;
content = content.replace(target2, replacement2);

fs.writeFileSync('src/components/CartDrawer.tsx', content);
