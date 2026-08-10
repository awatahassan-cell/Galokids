const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders'`;

const replacement = `              </table>
            </div>
            <Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 10)} />
          </div>
        </div>
      )}

      {activeTab === 'orders'`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('done products');
