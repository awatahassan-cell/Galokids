const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

code = code.replace(
  /const intervalId = setInterval\(\(\) => \{[\s\S]*?\}, 10000\);\s*return \(\) => clearInterval\(intervalId\);/,
  '// Polling disabled for server-side pagination'
);

// Also add refreshReviews to initial load
code = code.replace(
  /refreshExpenses\(\);/,
  'refreshExpenses();\n    refreshReviews();'
);

fs.writeFileSync('src/store.tsx', code);
console.log('done');
