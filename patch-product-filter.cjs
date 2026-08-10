const fs = require('fs');
let code = fs.readFileSync('src/components/ProductFilter.tsx', 'utf8');

if (!code.includes('getColorHex')) {
  code = code.replace(
    /import \{ useLanguage \} from '\.\.\/i18n\/LanguageContext';/,
    `import { useLanguage } from '../i18n/LanguageContext';\nimport { getColorHex } from '../utils/colors';`
  );
  
  const targetRegex = /<button[\s\S]*?onClick=\{\(\) => toggleColor\(color\)\}[\s\S]*?<\/button>/;
  const match = code.match(targetRegex);
  if (match) {
    code = code.replace(targetRegex, `<button
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={\`w-8 h-8 rounded-full border-2 transition-transform \${
                    filters.colors.includes(color) 
                      ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2 scale-110' 
                      : 'border-white hover:scale-110 shadow-sm'
                  }\`}
                  style={{ backgroundColor: getColorHex(color) }}
                  title={color}
                />`);
    fs.writeFileSync('src/components/ProductFilter.tsx', code);
    console.log('patched ProductFilter');
  } else {
    console.log('could not find match');
  }
}
