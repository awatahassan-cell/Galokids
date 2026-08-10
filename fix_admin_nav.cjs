const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const mobileTarget = `          <button
            onClick={() => { setActiveTab('banner'); setIsMobileMenuOpen(false); }}`;
const mobileReplacement = `          <button
            onClick={() => { setActiveTab('coupons'); setIsMobileMenuOpen(false); }}
            className={\`flex items-center w-full py-2.5 px-4 text-sm font-medium rounded-xl transition-all \${
              activeTab === 'coupons'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }\`}
          >
            <Ticket className="w-4 h-4 mr-3" /> Coupons
          </button>
          <button
            onClick={() => { setActiveTab('banner'); setIsMobileMenuOpen(false); }}`;
content = content.replace(mobileTarget, mobileReplacement);

const desktopTarget = `          <button
            onClick={() => setActiveTab('banner')}`;
const desktopReplacement = `          <button
            onClick={() => setActiveTab('coupons')}
            className={\`flex items-center w-full py-2.5 px-4 text-sm font-medium rounded-xl transition-all \${
              activeTab === 'coupons'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }\`}
          >
            <Ticket className="w-4 h-4 mr-3" /> Coupons
          </button>
          <button
            onClick={() => setActiveTab('banner')}`;
content = content.replace(desktopTarget, desktopReplacement);

fs.writeFileSync('src/pages/Admin.tsx', content);
