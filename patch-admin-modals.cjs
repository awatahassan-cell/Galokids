const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// 1. Add states
if (!code.includes('isAddingCategory')) {
  code = code.replace(
    /const \[isAddingProduct, setIsAddingProduct\] = useState\(false\);/,
    `const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);`
  );
}

// 2. Patch Categories
const catTabRegex = /\{activeTab === 'categories' && \(\s*<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">\s*<h2 className="text-lg font-semibold text-slate-900 mb-4">Create New Category<\/h2>\s*<form onSubmit=\{handleAddCategory\} className="space-y-4 max-w-md">/;
const newCatTabStart = `{activeTab === 'categories' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Categories Management</h2>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </button>
          </div>

          {isAddingCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Create New Category</h2>
                  <button onClick={() => setIsAddingCategory(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={(e) => { handleAddCategory(e); setIsAddingCategory(false); }} className="space-y-4">`;

code = code.replace(catTabRegex, newCatTabStart);

const endOfCatFormRegex = /<\/form>\s*<div className="mt-8 pt-8 border-t border-slate-100">\s*<h2 className="text-lg font-bold text-slate-900 mb-6">Existing Categories<\/h2>/;
const newEndOfCatForm = `              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingCategory(false)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">Save Category</button>
              </div>
            </form>
            </div>
            </div>
          )}

          <div className="mt-4">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Existing Categories</h2>`;
code = code.replace(/<button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center">\s*<Save className="w-4 h-4 mr-2" \/> Save Category\s*<\/button>\s*<\/form>\s*<div className="mt-8 pt-8 border-t border-slate-100">\s*<h2 className="text-lg font-bold text-slate-900 mb-6">Existing Categories<\/h2>/, newEndOfCatForm);


// 3. Patch Expenses
const expenseTabRegex = /\{activeTab === 'expenses' && \(\s*<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">\s*<h2 className="text-lg font-semibold text-slate-900 mb-6">Record New Expense<\/h2>\s*<form onSubmit=\{handleAddExpense\} className="space-y-4 max-w-xl mb-8">/;
const newExpenseTabStart = `{activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Expenses Management</h2>
            <button
              onClick={() => setIsAddingExpense(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </button>
          </div>

          {isAddingExpense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Record New Expense</h2>
                  <button onClick={() => setIsAddingExpense(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={(e) => { handleAddExpense(e); setIsAddingExpense(false); }} className="space-y-4">`;

code = code.replace(expenseTabRegex, newExpenseTabStart);

const endOfExpenseFormRegex = /<\/form>\s*<div className="border-t border-slate-100 pt-8">\s*<h2 className="text-lg font-bold text-slate-900 mb-6">Expense History<\/h2>/;
const newEndOfExpenseForm = `              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingExpense(false)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center">
                  <Save className="w-4 h-4 mr-2" /> Save Expense
                </button>
              </div>
            </form>
            </div>
            </div>
          )}

          <div className="mt-4">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Expense History</h2>`;

code = code.replace(/<button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center">\s*<Save className="w-4 h-4 mr-2" \/> Save Expense\s*<\/button>\s*<\/form>\s*<div className="border-t border-slate-100 pt-8">\s*<h2 className="text-lg font-bold text-slate-900 mb-6">Expense History<\/h2>/, newEndOfExpenseForm);


// 4. Patch Users
const userTabRegex = /\{activeTab === 'users' && \(\s*<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">\s*<h2 className="text-lg font-semibold text-slate-900 mb-6">User Management<\/h2>\s*<form onSubmit=\{handleAddUser\} className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">/;
const newUserTabStart = `{activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">User Management</h2>
            <button
              onClick={() => setIsAddingUser(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add User
            </button>
          </div>

          {isAddingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Create New User</h2>
                  <button onClick={() => setIsAddingUser(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={(e) => { handleAddUser(e); setIsAddingUser(false); }} className="space-y-4">`;

code = code.replace(userTabRegex, newUserTabStart);

const endOfUserFormRegex = /<\/form>\s*<div className="overflow-x-auto">/;
const newEndOfUserForm = `                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                    Create User
                  </button>
                </div>
              </div>
            </form>
            </div>
            </div>
          )}

          <div className="overflow-x-auto mt-4">`;

code = code.replace(/<button type="submit" className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center">\s*<UserPlus className="w-4 h-4 mr-2" \/> Create User\s*<\/button>\s*<\/div>\s*<\/form>\s*<div className="overflow-x-auto">/, newEndOfUserForm);


fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('patched other modals');
