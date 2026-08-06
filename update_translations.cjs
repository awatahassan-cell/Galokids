const fs = require('fs');

let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');
content = content.replace("products: 'Products',", "products: 'Products',\n    categories: 'Categories',");
content = content.replace("products: 'بەرهەمەکان',", "products: 'بەرهەمەکان',\n    categories: 'بەشەکان',");
content = content.replace("products: 'المنتجات',", "products: 'المنتجات',\n    categories: 'الأقسام',");
fs.writeFileSync('src/i18n/translations.ts', content);
