const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');
code = code.replace(
  /body: JSON\.stringify\(convertKeysToSnakeCase\(product\)\),/g,
  `body: JSON.stringify(convertKeysToSnakeCase(product)),`
);
// I can just replace `body: JSON.stringify(convertKeysToSnakeCase(product))`
// with `body: JSON.stringify(convertKeysToSnakeCase((() => { const p = {...product}; delete p.gender; return p; })()))`
