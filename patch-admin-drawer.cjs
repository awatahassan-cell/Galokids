const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const navMenuRegex = /\{\/\* Mobile Navigation Drawer \*\/\}\s*\{isMobileMenuOpen && \(\s*<div className="fixed inset-0 z-50 flex md:hidden">([\s\S]*?)\{\/\* Desktop Vertical Navigation Menu \*\/\}/;
const navMenuMatch = code.match(navMenuRegex);
if (navMenuMatch) {
  // Replace the whole mobile drawer with an animated one
  const oldDrawer = navMenuMatch[0];
  
  // Extract the buttons from the old drawer to reuse them
  const buttonsRegex = /<div className="flex-1 h-0 overflow-y-auto p-4 space-y-1">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*\{\/\* Desktop Vertical Navigation Menu \*\/\}/;
  const buttonsMatch = oldDrawer.match(buttonsRegex);
  
  if (buttonsMatch) {
    const buttons = buttonsMatch[1];
    
    const newDrawer = `{/* Mobile Navigation Drawer */}
        <>
          {/* Backdrop */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar Panel */}
          <div 
            className={\`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) \${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } flex flex-col md:hidden\`}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100/80">
              <span className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Admin Menu
              </span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4">
              <div className="space-y-1 mb-8">
                <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Management</h3>
                ${buttons}
              </div>
            </div>
          </div>
        </>

        {/* Desktop Vertical Navigation Menu */}`;

    code = code.replace(oldDrawer, newDrawer);
    fs.writeFileSync('src/pages/Admin.tsx', code);
    console.log('patched animated drawer');
  } else {
    console.log('Failed to match buttons');
  }
} else {
  console.log('Failed to match mobile drawer');
}

