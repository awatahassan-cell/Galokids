const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const navMenuRegex = /\{\/\* Vertical Navigation Menu \*\/\}\s*<div className="md:col-span-1 flex flex-col space-y-1 bg-white p-4 rounded-2xl border border-slate-200 h-fit">([\s\S]*?)<\/div>\s*\{\/\* Content Area \*\/\}/;
const navMenuMatch = code.match(navMenuRegex);
if (navMenuMatch) {
  let navMenuContent = navMenuMatch[1];
  
  // Update setActiveTab in navMenuContent to also close mobile menu
  let mobileNavContent = navMenuContent.replace(/setActiveTab\('([^']+)'\)/g, "setActiveTab('$1'); setIsMobileMenuOpen(false);");

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
                ${mobileNavContent}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Vertical Navigation Menu */}
        <div className="hidden md:flex md:col-span-1 flex-col space-y-1 bg-white p-4 rounded-2xl border border-slate-200 h-fit">
          ${navMenuContent}
        </div>
        {/* Content Area */}`;
  
  code = code.replace(navMenuRegex, replacement);
  fs.writeFileSync('src/pages/Admin.tsx', code);
  console.log('patched mobile sidebar drawer successfully');
} else {
  console.log('Failed to match nav menu');
}

