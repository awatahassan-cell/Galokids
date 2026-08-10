const fs = require('fs');
let code = fs.readFileSync('src/pages/MyOrders.tsx', 'utf8');

if (!code.includes('getColorHex')) {
  code = code.replace(
    /import \{ useLanguage \} from '\.\.\/i18n\/LanguageContext';/,
    `import { useLanguage } from '../i18n/LanguageContext';\nimport { getColorHex } from '../utils/colors';`
  );
  
  code = code.replace(
    /\{item\.variation\.color\} \/ \{item\.variation\.size\}/g,
    `<span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: getColorHex(item.variation.color) }} title={item.variation.color} /> {item.variation.size}</span>`
  );
  
  fs.writeFileSync('src/pages/MyOrders.tsx', code);
  console.log('patched MyOrders');
}
