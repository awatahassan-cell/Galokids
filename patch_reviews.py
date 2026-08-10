import re

with open('src/store.tsx', 'r') as f:
    code = f.read()

# Add reviewsPagination to context type
if 'reviewsPagination: PaginationMeta;' not in code:
    code = code.replace(
        "expensesPagination: PaginationMeta;",
        "expensesPagination: PaginationMeta;\n  reviewsPagination: PaginationMeta;\n  reviews: Review[];\n  refreshReviews: (page?: number, limit?: number) => void;"
    )

# Add state
if 'const [reviewsPagination' not in code:
    code = code.replace(
        "const [expensesPagination, setExpensesPagination] = useState<PaginationMeta>(defaultPagination);",
        "const [expensesPagination, setExpensesPagination] = useState<PaginationMeta>(defaultPagination);\n  const [reviewsPagination, setReviewsPagination] = useState<PaginationMeta>(defaultPagination);\n  const [reviews, setReviews] = useState<Review[]>([]);"
    )

# Add to provider
if 'reviewsPagination,' not in code:
    code = code.replace(
        "expensesPagination,",
        "expensesPagination, reviewsPagination, reviews, refreshReviews,"
    )

# Add refreshReviews function
refresh_reviews = """
  const refreshReviews = (page = 1, limit = 10) => {
    fetch(`${LARAVEL_API_BASE}/reviews?page=${page}&limit=${limit}`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { return []; } return res.json(); })
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
          setReviews(items);
          setReviewsPagination(pagMeta);
        }
      })
      .catch(err => console.error('Failed to load reviews from API:', err));
  };
"""
if 'const refreshReviews =' not in code:
    code = code.replace(
        "const refreshCategories = () => {",
        refresh_reviews + "\n  const refreshCategories = () => {"
    )

with open('src/store.tsx', 'w') as f:
    f.write(code)

print("done")
