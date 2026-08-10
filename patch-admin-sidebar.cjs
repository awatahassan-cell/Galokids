const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Add Menu, X icons to imports
if (!code.includes('Menu')) {
  code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Menu, X } from 'lucide-react';");
}

// Add state for sidebar
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState\('overview'\);/,
  `const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);`
);

// Replace header section to include mobile trigger button
code = code.replace(
  /<div className="mb-8">\s*<h1 className="text-3xl font-bold text-slate-900 tracking-tight">\{t\('adminDashboard'\)\}<\/h1>\s*<p className="text-slate-500 mt-2">Manage your inventory, products, orders, users, and finances\.<\/p>\s*<\/div>/,
  `<div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('adminDashboard')}</h1>
          <p className="text-slate-500 mt-2 hidden sm:block">Manage your inventory, products, orders, users, and finances.</p>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>`
);

// Extract the Vertical Navigation Menu content
const navMenuRegex = /\{\/\* Vertical Navigation Menu \*\/\}\s*<div className="md:col-span-1 flex flex-col space-y-1 bg-white p-4 rounded-2xl border border-slate-200 h-fit">([\s\S]*?)<\/div>\s*<div className="md:col-span-3 space-y-8">/;
const navMenuMatch = code.match(navMenuRegex);
if (navMenuMatch) {
  let navMenuContent = navMenuMatch[1];
  
  // Update setActiveTab in navMenuContent to also close mobile menu
  navMenuContent = navMenuContent.replace(/setActiveTab\('([^']+)'\)/g, "setActiveTab('$1'); setIsMobileMenuOpen(false);");

  const replacement = `
        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-lg text-slate-900">Admin Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 h-0 overflow-y-auto p-4 space-y-1">
                ${navMenuContent}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Vertical Navigation Menu */}
        <div className="hidden md:flex md:col-span-1 flex-col space-y-1 bg-white p-4 rounded-2xl border border-slate-200 h-fit">
          ${navMenuContent.replace(/setIsMobileMenuOpen\(false\);/g, "")}
        </div>
        <div className="md:col-span-3 space-y-8">`;
  
  code = code.replace(navMenuRegex, replacement);
}

fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('patched mobile sidebar');
