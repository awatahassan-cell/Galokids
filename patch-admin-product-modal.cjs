const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

if (!code.includes('isAddingProduct')) {
  code = code.replace(
    /const \[activeTab, setActiveTab\] = useState\('overview'\);/,
    `const [activeTab, setActiveTab] = useState('overview');
  const [isAddingProduct, setIsAddingProduct] = useState(false);`
  );
}

// Replace the start of the products tab:
const productTabRegex = /\{activeTab === 'products' && \(\s*<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">\s*<h2 className="text-lg font-semibold text-slate-900 mb-6">Create New Product<\/h2>\s*<form onSubmit=\{handleAddProduct\}/;
const newProductTabStart = `{activeTab === 'products' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Products Management</h2>
            <button
              onClick={() => setIsAddingProduct(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </button>
          </div>

          {isAddingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-xl relative">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Create New Product</h2>
                  <button onClick={() => setIsAddingProduct(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={(e) => { handleAddProduct(e); setIsAddingProduct(false); }}`;
code = code.replace(productTabRegex, newProductTabStart);

// Now find where the form ends and the table starts
const endOfFormRegex = /<\/form>\s*<div className="mt-12 pt-8 border-t border-slate-100">\s*<h2 className="text-lg font-bold text-slate-900 mb-6">Existing Products & Stock<\/h2>/;
const newEndOfForm = `              <button type="button" onClick={() => setIsAddingProduct(false)} className="px-6 py-2.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors mr-3">Cancel</button>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm"
              >
                <Save className="w-5 h-5 mr-2" /> Save Product
              </button>
            </div>
          </form>
          </div>
          </div>
          )}

          <div className="mt-4">
`;
code = code.replace(/<button\s*type="submit"\s*className="bg-indigo-600 text-white px-6 py-2\.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center shadow-sm"\s*>\s*<Save className="w-5 h-5 mr-2" \/> Save Product\s*<\/button>\s*<\/div>\s*<\/form>\s*<div className="mt-12 pt-8 border-t border-slate-100">\s*<h2 className="text-lg font-bold text-slate-900 mb-6">Existing Products & Stock<\/h2>/, newEndOfForm);

fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('patched product modal');
