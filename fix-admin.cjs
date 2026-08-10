const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

code = code.replace(/onClick=\{\(\) => setActiveTab\('([^']+)'\); setIsMobileMenuOpen\(false\);\}/g, "onClick={() => { setActiveTab('$1'); setIsMobileMenuOpen(false); }}");

fs.writeFileSync('src/pages/Admin.tsx', code);
console.log('Fixed JSX syntax error');
