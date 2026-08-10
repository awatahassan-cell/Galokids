const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace the incorrect end of categories form
code = code.replace(
  /<button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center">\s*<Plus className="w-4 h-4 mr-2" \/> Add Category\s*<\/button>\s*<\/form>\s*<div className="mt-8">\s*<h3 className="text-sm font-medium text-slate-700 mb-3">Existing Categories<\/h3>/,
  `              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingCategory(false)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">Save Category</button>
              </div>
            </form>
            </div>
            </div>
          )}

          <div className="mt-4">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Existing Categories</h2>`
);

fs.writeFileSync('src/pages/Admin.tsx', code);
