import re

with open('src/store.tsx', 'r') as f:
    code = f.read()

# 1. Update Types
if 'PaginationMeta' not in code:
    code = code.replace("PromoBanner } from './types';", "PromoBanner, PaginationMeta } from './types';")

# 2. Update StoreContextType
type_replacement = """
  productsPagination: PaginationMeta;
  ordersPagination: PaginationMeta;
  expensesPagination: PaginationMeta;
  refreshProducts: (page?: number, limit?: number) => void;
  refreshOrders: (page?: number, limit?: number) => void;
  refreshExpenses: (page?: number, limit?: number) => void;
  refreshCategories: () => void;
"""
code = re.sub(
    r'  refreshProducts: \(\) => void;\n  refreshCategories: \(\) => void;\n  refreshOrders: \(\) => void;\n.*\n  refreshExpenses: \(\) => void;',
    type_replacement.strip('\n'),
    code
)

# 3. Add states
state_replacement = """
  const defaultPagination: PaginationMeta = { currentPage: 1, lastPage: 1, total: 0 };
  const [productsPagination, setProductsPagination] = useState<PaginationMeta>(defaultPagination);
  const [ordersPagination, setOrdersPagination] = useState<PaginationMeta>(defaultPagination);
  const [expensesPagination, setExpensesPagination] = useState<PaginationMeta>(defaultPagination);

  const [categories, setCategories] ="""
code = code.replace("  const [categories, setCategories] =", state_replacement)

# 4. Add pagination to the provider
code = code.replace(
    "categories, products, cart, wishlist, users, orders, expenses, currentUser, promoBanner,",
    "categories, products, cart, wishlist, users, orders, expenses, currentUser, promoBanner, productsPagination, ordersPagination, expensesPagination,"
)

# 5. Replace refreshProducts
refresh_products_old = """  const refreshProducts = () => {
    fetch(`${LARAVEL_API_BASE}/products`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(data => {
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          const localReviewsSaved = localStorage.getItem('kidskart_reviews_local');
          let localReviews: Review[] = [];
          if (localReviewsSaved) {
            try {
              localReviews = JSON.parse(localReviewsSaved);
            } catch (e) {}
          }
          
          const mergedProducts = camelData.map((p: Product) => {
            const prodReviews = p.reviews || [];
            const matchingLocal = localReviews.filter((r: any) => String(r.productId) === String(p.id));
            const allReviews = [...prodReviews];
            for (const lr of matchingLocal) {
              if (!allReviews.some(r => r.id === lr.id)) {
                allReviews.push(lr);
              }
            }
            return {
              ...p,
              reviews: allReviews
            };
          });
          setProducts(mergedProducts);
        }
      })
      .catch(err => console.error('Failed to load products from API:', err));
  };"""

refresh_products_new = """  const refreshProducts = (page = 1, limit = 10) => {
    fetch(`${LARAVEL_API_BASE}/products?page=${page}&limit=${limit}`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(data => {
        const camelData = convertKeysToCamelCase(data);
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
            return {
              ...p,
              reviews: allReviews
            };
          });
          setProducts(mergedProducts);
          setProductsPagination(pagMeta);
        }
      })
      .catch(err => console.error('Failed to load products from API:', err));
  };"""
code = code.replace(refresh_products_old, refresh_products_new)

# 6. Replace refreshOrders
refresh_orders_old = """  const refreshOrders = () => {
    fetch(`${LARAVEL_API_BASE}/orders`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(data => {
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          setOrders(camelData);
        }
      })
      .catch(err => console.error('Failed to load orders from API:', err));
  };"""

refresh_orders_new = """  const refreshOrders = (page = 1, limit = 10) => {
    fetch(`${LARAVEL_API_BASE}/orders?page=${page}&limit=${limit}`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(data => {
        const camelData = convertKeysToCamelCase(data);
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
          setOrders(items);
          setOrdersPagination(pagMeta);
        }
      })
      .catch(err => console.error('Failed to load orders from API:', err));
  };"""
code = code.replace(refresh_orders_old, refresh_orders_new)

# 7. Replace refreshExpenses
refresh_expenses_old = """  const refreshExpenses = () => {
    fetch(`${LARAVEL_API_BASE}/expenses`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(data => {
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          setExpenses(camelData);
          localStorage.setItem('kidskart_expenses_local', JSON.stringify(camelData));
        }
      })
      .catch(err => console.error('Failed to load expenses from API:', err));
  };"""

refresh_expenses_new = """  const refreshExpenses = (page = 1, limit = 10) => {
    fetch(`${LARAVEL_API_BASE}/expenses?page=${page}&limit=${limit}`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(data => {
        const camelData = convertKeysToCamelCase(data);
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
          setExpenses(items);
          setExpensesPagination(pagMeta);
          localStorage.setItem('kidskart_expenses_local', JSON.stringify(items));
        }
      })
      .catch(err => console.error('Failed to load expenses from API:', err));
  };"""
code = code.replace(refresh_expenses_old, refresh_expenses_new)

with open('src/store.tsx', 'w') as f:
    f.write(code)

print("done")
