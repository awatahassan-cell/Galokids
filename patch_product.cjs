const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

code = code.replace(
  /body: JSON\.stringify\(convertKeysToSnakeCase\(\(\(\) => \{ const p = \{\.\.\.product\}; delete p\.id; return p; \}\)\(\)\)\),/g,
  `body: JSON.stringify(convertKeysToSnakeCase((() => { 
        const p = {...product}; 
        delete p.id; 
        if (p.variations) {
          p.variations = p.variations.map(v => {
            const newV = {...v};
            delete newV.id;
            delete newV.productId;
            return newV;
          });
        }
        return p; 
      })())),`
);

fs.writeFileSync('src/store.tsx', code);
