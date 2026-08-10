const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

if (!code.includes('PaginationMeta')) {
  code += `\n\nexport interface PaginationMeta {\n  currentPage: number;\n  lastPage: number;\n  total: number;\n}\n`;
  fs.writeFileSync('src/types.ts', code);
}
