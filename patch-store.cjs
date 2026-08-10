const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

code = code.replace(
  /const newV = \{\.\.\.v\};\s*delete newV\.id;/g,
  `const newV = {...v};
            if (String(newV.id).startsWith('v_temp') || String(newV.id).startsWith('v')) {
              // it's a temp ID from frontend, remove it for backend
              delete newV.id;
            }`
);

fs.writeFileSync('src/store.tsx', code);
console.log('patched store.tsx');
