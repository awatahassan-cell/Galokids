const fs = require('fs');
let code = fs.readFileSync('src/pages/POS.tsx', 'utf8');

// Imports
code = code.replace(
  "import React, { useState, useMemo } from 'react';",
  "import React, { useState, useMemo, useEffect } from 'react';\nimport { Pagination } from '../components/Pagination';"
);

// Destructuring
code = code.replace(
  "const { products, addOrder } = useStore();",
  "const { products, addOrder, productsPagination, refreshProducts } = useStore();"
);

// Search effect
const effect = `  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProducts(1, 20, { search });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);`;

code = code.replace(
  "const [posCart, setPosCart] = useState<{product: Product, variation: ProductVariation, quantity: number}[]>([]);",
  `const [posCart, setPosCart] = useState<{product: Product, variation: ProductVariation, quantity: number}[]>([]);\n\n${effect}`
);

// Filtered products
code = code.replace(
  `  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.name || '').toLowerCase().includes((search || '').toLowerCase()) || 
      (p.sku || '').toLowerCase().includes((search || '').toLowerCase())
    );
  }, [products, search]);`,
  "  const filteredProducts = products;"
);

// Add Pagination
const target = `            </div>
          </div>
        </div>

        {/* Cart/Checkout Section */}`;
        
const replacement = `            </div>
            {productsPagination && productsPagination.lastPage > 1 && (
              <div className="mt-6">
                <Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 20, { search })} />
              </div>
            )}
          </div>
        </div>

        {/* Cart/Checkout Section */}`;
        
code = code.replace(target, replacement);

fs.writeFileSync('src/pages/POS.tsx', code);
console.log('patched pos');
