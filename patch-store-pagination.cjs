const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

// 1. Add PaginationMeta to import
code = code.replace(/PromoBanner\s*\} from '\.\/types';/, 'PromoBanner, PaginationMeta } from \'./types\';');

// 2. Add properties to StoreContextType
const newProperties = `
  productsPagination: PaginationMeta;
  ordersPagination: PaginationMeta;
  expensesPagination: PaginationMeta;
  refreshProducts: (page?: number, limit?: number) => void;
  refreshOrders: (page?: number, limit?: number) => void;
  refreshExpenses: (page?: number, limit?: number) => void;`;
code = code.replace(/refreshProducts: \(\) => void;/g, newProperties.trim());
code = code.replace(/refreshOrders: \(\) => void;/g, '');
code = code.replace(/refreshExpenses: \(\) => void;/g, '');

// 3. Add state variables in StoreProvider
const stateVars = `
  const defaultPagination: PaginationMeta = { currentPage: 1, lastPage: 1, total: 0 };
  const [productsPagination, setProductsPagination] = useState<PaginationMeta>(defaultPagination);
  const [ordersPagination, setOrdersPagination] = useState<PaginationMeta>(defaultPagination);
  const [expensesPagination, setExpensesPagination] = useState<PaginationMeta>(defaultPagination);
  
  // existing state vars
  const [categories, setCategories] =`;
code = code.replace(/const \[categories, setCategories\] =/, stateVars.trim());

// 4. Update refresh functions
code = code.replace(/const refreshProducts = \(\) => \{/, 'const refreshProducts = (page = 1, limit = 10) => {');
code = code.replace(/fetch\(\`\$\{LARAVEL_API_BASE\}\/products\`,/, 'fetch(`${LARAVEL_API_BASE}/products?page=${page}&limit=${limit}`,');

code = code.replace(/const refreshOrders = \(\) => \{/, 'const refreshOrders = (page = 1, limit = 10) => {');
code = code.replace(/fetch\(\`\$\{LARAVEL_API_BASE\}\/orders\`,/, 'fetch(`${LARAVEL_API_BASE}/orders?page=${page}&limit=${limit}`,');

code = code.replace(/const refreshExpenses = \(\) => \{/, 'const refreshExpenses = (page = 1, limit = 10) => {');
code = code.replace(/fetch\(\`\$\{LARAVEL_API_BASE\}\/expenses\`,/, 'fetch(`${LARAVEL_API_BASE}/expenses?page=${page}&limit=${limit}`,');


// 5. Update how data is handled for products
code = code.replace(/const camelData = convertKeysToCamelCase\(data\);\s*if \(Array\.isArray\(camelData\)\) \{/, 
`const camelData = convertKeysToCamelCase(data);
        let items = [];
        let pagMeta = { currentPage: page, lastPage: 1, total: 0 };
        
        if (Array.isArray(camelData)) {
          items = camelData;
          pagMeta.total = items.length;
        } else if (camelData && Array.isArray(camelData.data)) {
          items = camelData.data;
          pagMeta = { currentPage: camelData.currentPage || page, lastPage: camelData.lastPage || 1, total: camelData.total || items.length };
        }
        
        if (Array.isArray(items)) {
          const localReviewsSaved = localStorage.getItem('kidskart_reviews_local');
          let localReviews: Review[] = [];
          if (localReviewsSaved) {
            try {
              localReviews = JSON.parse(localReviewsSaved);
            } catch (e) {}
          }
          const mergedProducts = items.map((p: Product) => {
            const prodReviews = p.reviews || [];
            const matchingLocal = localReviews.filter((r: any) => String(r.productId) === String(p.id));
            const allReviews = [...prodReviews];
            for (const lr of matchingLocal) {
              if (!allReviews.some(r => r.id === lr.id)) {
                allReviews.push(lr);
              }
            }
            return { ...p, reviews: allReviews };
          });
          setProducts(mergedProducts);
          setProductsPagination(pagMeta);
        }
        // Removed original array check code
`);
// Remove original code inside refreshProducts
// Wait, regex might be tricky here. Let's use string operations instead.
fs.writeFileSync('src/store.tsx.bak', fs.readFileSync('src/store.tsx'));
