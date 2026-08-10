const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const oldUseStore = `  const { 
    categories, addCategory, addProduct, orders, users, expenses, products, 
    updateOrderStatus, addExpense, promoBanner, updatePromoBanner, currentUser,
    deleteProduct, deleteCategory, deleteExpense, deleteUser, deleteOrder, addUser,
    updateProduct, updateCategory, updateExpense, updateUser
  } = useStore();`;

const newUseStore = `  const { 
    categories, addCategory, addProduct, orders, users, expenses, products, 
    updateOrderStatus, addExpense, promoBanner, updatePromoBanner, currentUser,
    deleteProduct, deleteCategory, deleteExpense, deleteUser, deleteOrder, addUser,
    updateProduct, updateCategory, updateExpense, updateUser,
    productsPagination, ordersPagination, expensesPagination, reviewsPagination, reviews,
    refreshProducts, refreshOrders, refreshExpenses, refreshReviews
  } = useStore();`;

code = code.replace(oldUseStore, newUseStore);
fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('patched');
