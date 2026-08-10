const fs = require('fs');
let content = fs.readFileSync('src/pages/ProductDetail.tsx', 'utf8');

const target = `<p className="text-3xl font-bold font-display text-slate-900 mb-6">
            {Number(product.price || 0)}
          </p>`;

const replacement = `<div className="flex items-center gap-4 mb-6">
            {product.discountPrice ? (
              <>
                <p className="text-3xl font-bold font-display text-rose-500">
                  {Number(product.discountPrice)}
                </p>
                <p className="text-xl font-medium text-slate-400 line-through">
                  {Number(product.price || 0)}
                </p>
                <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  Sale
                </span>
              </>
            ) : (
              <p className="text-3xl font-bold font-display text-slate-900">
                {Number(product.price || 0)}
              </p>
            )}
          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/ProductDetail.tsx', content);
