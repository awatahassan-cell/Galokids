const fs = require('fs');
let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

const target = `<p className="text-xs sm:text-base font-extrabold text-slate-900">{Number(product.price)}</p>`;
const replacement = `          <div className="text-right">
            {product.discountPrice ? (
              <>
                <p className="text-[10px] sm:text-xs text-slate-400 line-through">{Number(product.price)}</p>
                <p className="text-xs sm:text-base font-extrabold text-rose-500">{Number(product.discountPrice)}</p>
              </>
            ) : (
              <p className="text-xs sm:text-base font-extrabold text-slate-900">{Number(product.price)}</p>
            )}
          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ProductCard.tsx', content);
