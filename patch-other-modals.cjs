const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Users
code = code.replace(
  /\{activeTab === 'users' && \(\s*<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto">\s*<h2 className="text-lg font-semibold text-slate-900 mb-6">Users Management<\/h2>\s*<form onSubmit=\{handleAddUser\} className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">/,
  `{activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Users Management</h2>
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
                <form onSubmit={(e) => { handleAddUser(e); setIsAddingUser(false); }} className="space-y-4">`
);

code = code.replace(
  /<button\s*type="submit"\s*className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center transition-all"\s*>\s*<Plus className="w-3\.5 h-3\.5 mr-1" \/> Create User\s*<\/button>\s*<\/div>\s*<\/form>\s*<table className="min-w-full divide-y divide-slate-200">/,
  `                 <div className="flex justify-end gap-3 mt-6">
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

          <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-slate-200">`
);

// Expenses
code = code.replace(
  /\{activeTab === 'expenses' && \(\s*<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">\s*<h2 className="text-lg font-semibold text-slate-900 mb-6">Manage Expenses<\/h2>\s*<form onSubmit=\{handleAddExpense\} className="flex flex-col sm:flex-row gap-4 items-end mb-8 bg-slate-50 p-4 rounded-lg">/,
  `{activeTab === 'expenses' && (
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
                <form onSubmit={(e) => { handleAddExpense(e); setIsAddingExpense(false); }} className="space-y-4">`
);

code = code.replace(
  /<button type="submit" className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center">\s*<Plus className="w-4 h-4 mr-2" \/> Add\s*<\/button>\s*<\/form>\s*<div className="overflow-x-auto">/,
  `             <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingExpense(false)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center">
                  <Save className="w-4 h-4 mr-2" /> Save Expense
                </button>
              </div>
            </form>
            </div>
            </div>
          )}

          <div className="overflow-x-auto mt-4">`
);

fs.writeFileSync('src/pages/Admin.tsx', code);
