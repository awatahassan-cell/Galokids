const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductDetail.tsx', 'utf8');

code = code.replace(
  /\{t\('color'\)\}: <span className="text-slate-500 font-normal">\{selectedColor \|\| 'None'\}<\/span>/,
  `{t('color')}: {selectedColor ? <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(selectedColor) }} title={selectedColor} /></span> : <span className="text-slate-500 font-normal">None</span>}`
);

fs.writeFileSync('src/pages/ProductDetail.tsx', code);
console.log('patched ProductDetail again');
