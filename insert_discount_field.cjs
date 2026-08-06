const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>`;
const replacement = `              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>`;
content = content.replace(target, replacement);

const target2 = `                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost *</label>`;
const replacement2 = `                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount Price (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productDiscountPrice}
                    onChange={(e) => setProductDiscountPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost *</label>`;
content = content.replace(target2, replacement2);

fs.writeFileSync('src/pages/Admin.tsx', content);
