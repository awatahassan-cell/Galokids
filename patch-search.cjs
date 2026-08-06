const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

// 1. Update Context Type
code = code.replace(
  "refreshProducts: (page?: number, limit?: number) => void;",
  "refreshProducts: (page?: number, limit?: number, filters?: any) => void;"
);

// 2. Update refreshProducts implementation
const oldRefreshProducts = "const refreshProducts = (page = 1, limit = 10) => {";
const newRefreshProducts = `const refreshProducts = (page = 1, limit = 10, filters: any = {}) => {
    let url = \`\${LARAVEL_API_BASE}/products?page=\${page}&limit=\${limit}\`;
    
    if (filters.search) url += \`&search=\${encodeURIComponent(filters.search)}\`;
    if (filters.categoryId) url += \`&category_id=\${encodeURIComponent(filters.categoryId)}\`;
    if (filters.gender) url += \`&gender=\${encodeURIComponent(filters.gender)}\`;
    if (filters.inStockOnly) url += \`&in_stock=1\`;
    
    if (filters.colors && filters.colors.length > 0) {
      filters.colors.forEach((c: string) => url += \`&colors[]=\${encodeURIComponent(c)}\`);
    }
    if (filters.sizes && filters.sizes.length > 0) {
      filters.sizes.forEach((s: string) => url += \`&sizes[]=\${encodeURIComponent(s)}\`);
    }
`;

code = code.replace(oldRefreshProducts, newRefreshProducts);
code = code.replace(
  /fetch\(\`\$\{LARAVEL_API_BASE\}\/products\?page=\$\{page\}&limit=\$\{limit\}\`, \{ headers: getAuthHeaders\(\) \}\)/,
  "fetch(url, { headers: getAuthHeaders() })"
);

fs.writeFileSync('src/store.tsx', code);
console.log('patched store');
