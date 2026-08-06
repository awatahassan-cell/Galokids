const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

if (!code.includes('getColorHex')) {
  code = code.replace(
    /import \{ useStore \} from '\.\.\/store';/,
    `import { useStore } from '../store';\nimport { getColorHex } from '../utils/colors';`
  );
  
  code = code.replace(
    /style=\{\{ backgroundColor: color\.toLowerCase\(\) === 'blue' \? '#3b82f6' : [^}]+\}\}/,
    `style={{ backgroundColor: getColorHex(color) }}`
  );
  
  fs.writeFileSync('src/components/ProductCard.tsx', code);
  console.log('patched ProductCard');
}
