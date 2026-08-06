const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `              {products.flatMap(p => p.reviews?.map(r => ({ ...r, productName: p.name })) || []).map((review, index) => (
                <tr key={\`\${review.productId || ''}-\${review.id || ''}-\${index}\`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{review.productName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">{review.author}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex text-yellow-400">
                      {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate" title={review.comment}>{review.comment}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{review.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'banner'`;

const replacement = `              {reviews.map((review, index) => (
                <tr key={\`\${review.productId || ''}-\${review.id || ''}-\${index}\`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{review.productName || review.productId}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">{review.author || review.customerName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex text-yellow-400">
                      {[...Array(review.rating || 5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate" title={review.comment}>{review.comment}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{review.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={reviewsPagination} onPageChange={(page) => refreshReviews(page, 10)} />
        </div>
      )}

      {activeTab === 'banner'`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('done reviews');
