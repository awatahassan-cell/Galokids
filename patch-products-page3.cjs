const fs = require('fs');
let code = fs.readFileSync('src/pages/Products.tsx', 'utf8');

const oldUseEffect = `  useEffect(() => {
    // Simulate data fetching
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [filters, searchQuery]);`;

const newUseEffect = `  useEffect(() => {
    setIsLoading(true);
    refreshProducts(1, 10, { ...filters, search: searchQuery });
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [filters, searchQuery]);`;

code = code.replace(oldUseEffect, newUseEffect);

// Remove client-side filtering completely to rely on server side? Or keep it since it might not be implemented on server?
// User said "Implement server side search for products and filtering".
// So let's replace \`filteredProducts\` with \`products\`

const oldFilteredProducts = `  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      if (searchQuery) {
        const matchesName = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = product.categoryId.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesName && !matchesCategory) return false;
      }

      if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
      if (filters.gender && product.gender !== filters.gender) return false;

      const variations = product.variations || [];
      const totalStock = variations.reduce((acc, curr) => acc + curr.stockQuantity, 0);
      if (filters.inStockOnly && totalStock === 0) return false;

      let matchesColor = filters.colors.length === 0;
      let matchesSize = filters.sizes.length === 0;

      if (!matchesColor || !matchesSize) {
        const matchingVariation = variations.some(v => {
          const colorMatch = filters.colors.length === 0 || filters.colors.includes(v.color);
          const sizeMatch = filters.sizes.length === 0 || filters.sizes.includes(v.size);
          const stockMatch = !filters.inStockOnly || v.stockQuantity > 0;
          return colorMatch && sizeMatch && stockMatch;
        });
        if (!matchingVariation) return false;
      }

      return true;
    });
  }, [filters, products]);`;

const newFilteredProducts = `  const filteredProducts = products || [];`;

code = code.replace(oldFilteredProducts, newFilteredProducts);
code = code.replace(/<Pagination meta=\{productsPagination\} onPageChange=\{\(page\) => refreshProducts\(page, 10\)\} \/>/, "<Pagination meta={productsPagination} onPageChange={(page) => refreshProducts(page, 10, { ...filters, search: searchQuery })} />")

fs.writeFileSync('src/pages/Products.tsx', code);
console.log('patched');
