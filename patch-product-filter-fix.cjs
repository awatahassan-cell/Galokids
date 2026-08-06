const fs = require('fs');
let code = fs.readFileSync('src/components/ProductFilter.tsx', 'utf8');

code = code.replace(
  /                  title=\{color\}\n                \/>\n              \}\}\)/g,
  `                  title={color}\n                />\n              ))`
);
fs.writeFileSync('src/components/ProductFilter.tsx', code);
console.log('patched');
