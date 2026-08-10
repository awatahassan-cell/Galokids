const fs = require('fs');
let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

// Imports
code = code.replace(
  "import { Filter } from 'lucide-react';",
  "import { Filter } from 'lucide-react';\nimport { Pagination } from '../components/Pagination';"
);

// Destructuring
code = code.replace(
  "const { products } = useStore();",
  "const { products, productsPagination, refreshProducts } = useStore();"
);

// Add component
const target = `            </div>
          </div>
        </div>
      </div>
    </div>`;
const replacement = `            </div>
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
