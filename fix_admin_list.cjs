const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `<td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{Number(product.price || 0)}</td>`;
const replacement = `<td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                          {product.discountPrice ? (
                            <div>
                              <span className="line-through text-slate-400 font-normal mr-2">{Number(product.price || 0)}</span>
                              <span className="text-rose-500">{Number(product.discountPrice)}</span>
                            </div>
                          ) : (
                            Number(product.price || 0)
                          )}
                        </td>`;
content = content.replace(target, replacement);

fs.writeFileSync('src/pages/Admin.tsx', content);
