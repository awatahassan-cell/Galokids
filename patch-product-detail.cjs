const fs = require('fs');
let code = fs.readFileSync('src/pages/ProductDetail.tsx', 'utf8');

if (!code.includes("import { getColorHex } from '../utils/colors';")) {
  code = code.replace(
    /import \{ useLanguage \} from '\.\.\/i18n\/LanguageContext';/,
    `import { useLanguage } from '../i18n/LanguageContext';\nimport { getColorHex } from '../utils/colors';`
  );
  
  // Remove the getColorHex function from inside the component
  code = code.replace(/  const getColorHex = \([\s\S]*?  \};/, '');
  
  fs.writeFileSync('src/pages/ProductDetail.tsx', code);
  console.log('patched ProductDetail');
}
