const fs = require('fs');
let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

const target = `            )}
          </div>
        </div>
      </div>
    </div>`;

const replacement = `            )}
            {productsPagination && productsPagination.lastPage > 1 && (
              <div className="mt-8">
                <Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 10)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/Products.tsx', code);
console.log('patched');
